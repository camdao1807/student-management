import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { EndAdvisorDto, UpdateAdvisorDto } from './dto/update-advisor.dto';
import { QueryAdvisorDto } from './dto/query-advisor.dto';

// Trạng thái phân công tính theo ngày hiện tại
const STATUS_SQL = `(CASE
  WHEN a.start_date > CURDATE() THEN 'upcoming'
  WHEN a.end_date IS NOT NULL AND a.end_date < CURDATE() THEN 'ended'
  ELSE 'active' END)`;

const SELECT_SQL = `
  SELECT a.id, a.employee_id AS employeeId, e.employee_code AS employeeCode,
         e.full_name AS employeeName, e.email AS employeeEmail, e.is_active AS employeeActive,
         a.student_class_id AS studentClassId, c.class_code AS classCode, c.class_name AS className,
         c.major_name AS majorName,
         (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL) AS studentCount,
         DATE_FORMAT(a.start_date, '%Y-%m-%d') AS startDate,
         DATE_FORMAT(a.end_date, '%Y-%m-%d') AS endDate,
         ${STATUS_SQL} AS status, a.created_at AS createdAt
  FROM advisor_classe_sections a
  JOIN employees e ON e.id = a.employee_id
  JOIN student_classes c ON c.id = a.student_class_id`;

@Injectable()
export class AdvisorsService {
  constructor(private readonly ds: DataSource) {}

  async options() {
    const employees = await this.ds.query(
      `SELECT id, employee_code AS code, full_name AS name FROM employees WHERE is_active = 1 ORDER BY full_name`,
    );
    const classes = await this.ds.query(
      `SELECT id, class_code AS code, class_name AS name FROM student_classes WHERE is_active = 1 ORDER BY class_code`,
    );
    return { employees, classes };
  }

  async stats() {
    const [r] = await this.ds.query(
      `SELECT COUNT(*) AS total,
              SUM(${STATUS_SQL} = 'active') AS active,
              SUM(${STATUS_SQL} = 'upcoming') AS upcoming,
              SUM(${STATUS_SQL} = 'ended') AS ended
       FROM advisor_classe_sections a`,
    );
    return {
      total: Number(r.total), active: Number(r.active ?? 0),
      upcoming: Number(r.upcoming ?? 0), ended: Number(r.ended ?? 0),
    };
  }

  async findAll(q: QueryAdvisorDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (q.search) {
      const k = `%${q.search}%`;
      where.push('(e.employee_code LIKE ? OR e.full_name LIKE ? OR c.class_code LIKE ? OR c.class_name LIKE ?)');
      params.push(k, k, k, k);
    }
    if (q.classId) { where.push('a.student_class_id = ?'); params.push(q.classId); }
    if (q.employeeId) { where.push('a.employee_id = ?'); params.push(q.employeeId); }
    if (q.status) { where.push(`${STATUS_SQL} = ?`); params.push(q.status); }
    const w = ' WHERE ' + where.join(' AND ');

    const [{ total }] = await this.ds.query(
      `SELECT COUNT(*) AS total FROM advisor_classe_sections a
       JOIN employees e ON e.id = a.employee_id
       JOIN student_classes c ON c.id = a.student_class_id ${w}`, params);
    const items = await this.ds.query(
      `${SELECT_SQL} ${w} ORDER BY a.start_date DESC, a.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]);
    return { items, total: Number(total), page, limit };
  }

  async findOne(id: number) {
    const [row] = await this.ds.query(`${SELECT_SQL} WHERE a.id = ?`, [id]);
    if (!row) throw new NotFoundException('Không tìm thấy phân công');
    return row;
  }

  /** Lịch sử toàn bộ CVHT của một lớp (mới nhất trước). */
  async historyByClass(classId: number) {
    return this.ds.query(`${SELECT_SQL} WHERE a.student_class_id = ? ORDER BY a.start_date DESC, a.id DESC`, [classId]);
  }

  async create(dto: CreateAdvisorDto) {
    await this.validate(dto.employeeId, dto.studentClassId, dto.startDate, dto.endDate ?? null);
    try {
      const res = await this.ds.query(
        `INSERT INTO advisor_classe_sections (employee_id, student_class_id, start_date, end_date) VALUES (?, ?, ?, ?)`,
        [dto.employeeId, dto.studentClassId, dto.startDate, dto.endDate ?? null]);
      return this.findOne(res.insertId);
    } catch (e) { this.rethrow(e); }
  }

  async update(id: number, dto: UpdateAdvisorDto) {
    const cur = await this.findOne(id);
    const start = dto.startDate ?? cur.startDate;
    const end = dto.endDate !== undefined ? dto.endDate : cur.endDate;
    await this.validate(cur.employeeId, cur.studentClassId, start, end, id, false);
    try {
      await this.ds.query(`UPDATE advisor_classe_sections SET start_date = ?, end_date = ? WHERE id = ?`, [start, end, id]);
      return this.findOne(id);
    } catch (e) { this.rethrow(e); }
  }

  /** Kết thúc phân công (không xóa) để giữ lịch sử. */
  async end(id: number, dto: EndAdvisorDto) {
    const cur = await this.findOne(id);
    const end = dto.endDate ?? new Date().toISOString().slice(0, 10);
    if (end < cur.startDate) throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu');
    await this.ds.query(`UPDATE advisor_classe_sections SET end_date = ? WHERE id = ?`, [end, id]);
    return this.findOne(id);
  }

  private async validate(employeeId: number, classId: number, start: string, end: string | null,
                         excludeId = 0, checkRefs = true) {
    if (end && end < start) throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu');
    if (checkRefs) {
      const [emp] = await this.ds.query(`SELECT id, is_active FROM employees WHERE id = ?`, [employeeId]);
      if (!emp) throw new BadRequestException('Giảng viên không tồn tại');
      if (!emp.is_active) throw new BadRequestException('Giảng viên đang ngưng hoạt động');
      const [cls] = await this.ds.query(`SELECT id, is_active FROM student_classes WHERE id = ?`, [classId]);
      if (!cls) throw new BadRequestException('Lớp không tồn tại');
      if (!cls.is_active) throw new BadRequestException('Lớp đã ngưng hoạt động');
    }
    const [dup] = await this.ds.query(
      `SELECT a.id, e.full_name, DATE_FORMAT(a.start_date,'%d/%m/%Y') AS s, DATE_FORMAT(a.end_date,'%d/%m/%Y') AS e
       FROM advisor_classe_sections a JOIN employees e ON e.id = a.employee_id
       WHERE a.id <> ? AND a.student_class_id = ?
         AND a.start_date <= COALESCE(?, '9999-12-31')
         AND COALESCE(a.end_date, '9999-12-31') >= ? LIMIT 1`,
      [excludeId, classId, end, start]);
    if (dup) {
      throw new ConflictException(
        `Trùng thời gian với phân công của ${dup.full_name} (${dup.s} → ${dup.e ?? 'hiện tại'})`);
    }
  }

  private rethrow(e: any): never {
    if (e?.sqlState === '45000' || e?.errno === 1644) throw new ConflictException(e.sqlMessage);
    throw e;
  }
}