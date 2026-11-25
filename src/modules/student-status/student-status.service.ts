import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { BulkChangeStatusDto } from './dto/bulk-change-status.dto';
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
    const out: Record<string, number> = { studying: 0, reserved: 0, dropped: 0, graduated: 0, total: 0 };
    for (const r of rows) { out[r.status] = Number(r.total); out.total += Number(r.total); }
    return out;
  }

  /** Phần FROM/WHERE dùng chung cho danh sách và xuất Excel. */
  private buildFilter(q: QueryStatusDto) {
    if (q.fromDate && q.toDate && q.fromDate > q.toDate) {
      throw new BadRequestException('"Từ ngày" không được sau "Đến ngày"');
    }
    const where = ['s.deleted_at IS NULL'];
    const params: any[] = [];
    if (q.search) { where.push('(s.student_code LIKE ? OR s.full_name LIKE ?)'); params.push(`%${q.search}%`, `%${q.search}%`); }
    if (q.status) { where.push('cs.status = ?'); params.push(q.status); }
    if (q.classId) { where.push('s.class_id = ?'); params.push(q.classId); }
    if (q.fromDate) { where.push('cs.effective_date >= ?'); params.push(q.fromDate); }
    if (q.toDate) { where.push('cs.effective_date <= ?'); params.push(q.toDate); }
    const from = `FROM students s
      JOIN student_classes c ON c.id = s.class_id
      LEFT JOIN v_student_current_status cs ON cs.student_id = s.id
      WHERE ${where.join(' AND ')}`;
    return { from, params };
  }

  private selectList(from: string) {
    return `SELECT s.id, s.student_code AS studentCode, s.full_name AS fullName,
              c.class_code AS classCode, cs.status, cs.reason,
              DATE_FORMAT(cs.effective_date, '%Y-%m-%d') AS effectiveDate,
              (SELECT p.status FROM student_status p
                WHERE p.student_id = s.id AND p.id <> cs.id
                  AND (p.effective_date < cs.effective_date OR (p.effective_date = cs.effective_date AND p.id < cs.id))
                ORDER BY p.effective_date DESC, p.id DESC LIMIT 1) AS previousStatus
       ${from} ORDER BY cs.effective_date DESC, s.id DESC`;
  }

  async findAll(q: QueryStatusDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const { from, params } = this.buildFilter(q);
    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total ${from}`, params);
    const items = await this.ds.query(`${this.selectList(from)} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { items, total: Number(total), page, limit };
  }

  /** Xuất toàn bộ danh sách theo bộ lọc hiện tại (không phân trang). */
  async exportExcel(q: QueryStatusDto) {
    const { from, params } = this.buildFilter(q);
    const rows = await this.ds.query(this.selectList(from), params);
    const label = (s: string | null) => (s ? STATUS_LABEL[s as StudentStatus] ?? s : '');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Trạng thái học vụ');
    ws.columns = [
      { header: 'Mã SV', key: 'studentCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Lớp', key: 'classCode', width: 12 },
      { header: 'Trạng thái trước', key: 'previous', width: 18 },
      { header: 'Trạng thái hiện tại', key: 'current', width: 20 },
      { header: 'Ngày hiệu lực', key: 'date', width: 16 },
      { header: 'Lý do', key: 'reason', width: 45 },
    ];
    for (const r of rows) {
      ws.addRow({
        studentCode: r.studentCode, fullName: r.fullName, classCode: r.classCode,
        previous: label(r.previousStatus), current: label(r.status),
        date: r.effectiveDate ? r.effectiveDate.split('-').reverse().join('/') : '',
        reason: r.reason ?? '',
      });
    }
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    return wb.xlsx.writeBuffer();
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
    await this.ds.transaction((m) => this.applyChange(m, studentId, dto, userId));
    return this.history(studentId);
  }

  /** Đổi nhiều SV trong một transaction: một SV lỗi thì không SV nào bị đổi. */
  async bulkChange(dto: BulkChangeStatusDto, userId: number | null) {
    // Khóa theo thứ tự id tăng dần để tránh deadlock
    const ids = [...dto.studentIds].sort((a, b) => a - b);
    await this.ds.transaction(async (m) => {
      for (const id of ids) await this.applyChange(m, id, dto, userId);
    });
    return { updated: ids.length };
  }

  private async applyChange(m: EntityManager, studentId: number, dto: ChangeStatusDto, userId: number | null) {
    const next = dto.status as StudentStatus;
    const [st] = await m.query(
      `SELECT id, student_code AS code FROM students WHERE id = ? AND deleted_at IS NULL FOR UPDATE`, [studentId]);
    if (!st) throw new NotFoundException(`Không tìm thấy sinh viên (id ${studentId})`);

    const [last] = await m.query(
      `SELECT status, DATE_FORMAT(effective_date,'%Y-%m-%d') AS d FROM student_status
       WHERE student_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1`, [studentId]);
    const cur = (last?.status ?? null) as StudentStatus | null;
    const allowed: string[] = cur ? TRANSITIONS[cur] ?? [] : ['studying'];

    if (!allowed.includes(next)) {
      const from = cur ? STATUS_LABEL[cur] ?? cur : 'chưa có trạng thái';
      throw new BadRequestException(
        allowed.length
          ? `${st.code}: không thể chuyển từ "${from}" sang "${STATUS_LABEL[next]}". Chỉ được chuyển sang: ${allowed.map((s) => STATUS_LABEL[s as StudentStatus]).join(', ')}`
          : `${st.code}: "${from}" là trạng thái cuối, không thể thay đổi`);
    }
    if (last && dto.effectiveDate < last.d) {
      throw new BadRequestException(`${st.code}: ngày hiệu lực không được trước ngày hiệu lực gần nhất (${last.d.split('-').reverse().join('/')})`);
    }
    if (REASON_REQUIRED.includes(next) && !dto.reason?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do thay đổi trạng thái');
    }
    await m.query(
      `INSERT INTO student_status (student_id, status, reason, effective_date, created_by) VALUES (?, ?, ?, ?, ?)`,
      [studentId, next, dto.reason?.trim() || null, dto.effectiveDate, userId]);
  }
}