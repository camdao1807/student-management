import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChangeStatusDto } from './dto/change-status.dto';
import { QueryStatusDto } from './dto/query-status.dto';
import { REASON_REQUIRED, STATUS_LABEL, STATUSES, StudentStatus, TRANSITIONS } from './student-status.constants';

@Injectable()
export class StudentStatusService {
  constructor(private readonly ds: DataSource) {}

  meta() {
    return { statuses: STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })), transitions: TRANSITIONS, reasonRequired: REASON_REQUIRED };
  }

  async classes() {
    return this.ds.query(`SELECT id, class_code AS code, class_name AS name FROM student_classes ORDER BY class_code`);
  }

  /** Thống kê số SV theo trạng thái hiện tại. */
  async stats() {
    const rows = await this.ds.query(
      `SELECT cs.status, COUNT(*) AS total
       FROM students s JOIN v_student_current_status cs ON cs.student_id = s.id
       WHERE s.deleted_at IS NULL GROUP BY cs.status`);
    const out: Record<string, number> = { studying: 0, suspended: 0, dropped: 0, graduated: 0, total: 0 };
    for (const r of rows) { out[r.status] = Number(r.total); out.total += Number(r.total); }
    return out;
  }

  async findAll(q: QueryStatusDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where = ['s.deleted_at IS NULL'];
    const params: any[] = [];
    if (q.search) { where.push('(s.student_code LIKE ? OR s.full_name LIKE ?)'); params.push(`%${q.search}%`, `%${q.search}%`); }
    if (q.status) { where.push('cs.status = ?'); params.push(q.status); }
    if (q.classId) { where.push('s.class_id = ?'); params.push(q.classId); }
    const from = `FROM students s
      JOIN student_classes c ON c.id = s.class_id
      LEFT JOIN v_student_current_status cs ON cs.student_id = s.id
      WHERE ${where.join(' AND ')}`;

    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total ${from}`, params);
    const items = await this.ds.query(
      `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName,
              c.class_code AS classCode, cs.status, cs.reason,
              DATE_FORMAT(cs.effective_date, '%Y-%m-%d') AS effectiveDate,
              (SELECT p.status FROM student_status p
                WHERE p.student_id = s.id AND p.id <> cs.id
                  AND (p.effective_date < cs.effective_date OR (p.effective_date = cs.effective_date AND p.id < cs.id))
                ORDER BY p.effective_date DESC, p.id DESC LIMIT 1) AS previousStatus
       ${from} ORDER BY cs.effective_date DESC, s.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]);
    return { items, total: Number(total), page, limit };
  }

  async history(studentId: number) {
    const [st] = await this.ds.query(
      `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName, c.class_code AS classCode
       FROM students s JOIN student_classes c ON c.id = s.class_id WHERE s.id = ? AND s.deleted_at IS NULL`, [studentId]);
    if (!st) throw new NotFoundException('Không tìm thấy sinh viên');
    const history = await this.ds.query(
      `SELECT ss.id, ss.status, ss.reason, DATE_FORMAT(ss.effective_date, '%Y-%m-%d') AS effectiveDate,
              ss.created_at AS createdAt, u.username AS createdBy
       FROM student_status ss LEFT JOIN users u ON u.id = ss.created_by
       WHERE ss.student_id = ? ORDER BY ss.effective_date DESC, ss.id DESC`, [studentId]);
    const current = history[0]?.status ?? null;
    return { student: st, current, allowedNext: current ? TRANSITIONS[current as StudentStatus] ?? [] : ['studying'], history };
  }

  /** Đổi trạng thái: luôn INSERT dòng mới, không sửa/xóa lịch sử cũ. */
  async change(studentId: number, dto: ChangeStatusDto, userId: number | null) {
    const next = dto.status as StudentStatus;
    await this.ds.transaction(async (m) => {
      const [st] = await m.query(`SELECT id FROM students WHERE id = ? AND deleted_at IS NULL FOR UPDATE`, [studentId]);
      if (!st) throw new NotFoundException('Không tìm thấy sinh viên');

      const [last] = await m.query(
        `SELECT status, DATE_FORMAT(effective_date,'%Y-%m-%d') AS d FROM student_status
         WHERE student_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1`, [studentId]);
      const cur = (last?.status ?? null) as StudentStatus | null;
      const allowed = cur ? TRANSITIONS[cur] ?? [] : ['studying'];

      if (!allowed.includes(next)) {
        const from = cur ? STATUS_LABEL[cur] ?? cur : 'chưa có trạng thái';
        throw new BadRequestException(
          allowed.length
            ? `Không thể chuyển từ "${from}" sang "${STATUS_LABEL[next]}". Chỉ được chuyển sang: ${allowed.map((s) => STATUS_LABEL[s as StudentStatus]).join(', ')}`
            : `"${from}" là trạng thái cuối, không thể thay đổi`);
      }
      if (last && dto.effectiveDate < last.d) {
        throw new BadRequestException(`Ngày hiệu lực không được trước ngày hiệu lực gần nhất (${last.d})`);
      }
      if (REASON_REQUIRED.includes(next) && !dto.reason?.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do thay đổi trạng thái');
      }
      await m.query(
        `INSERT INTO student_status (student_id, status, reason, effective_date, created_by) VALUES (?, ?, ?, ?, ?)`,
        [studentId, next, dto.reason?.trim() || null, dto.effectiveDate, userId]);
    });
    return this.history(studentId);
  }
}