import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

const STATUS = ['assigned', 'completed'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** terms.term_code '2026-1' → 'HK1 2026-2027' */
const termShort = (code: string) => { const [y, n] = code.split('-'); return `HK${n} ${y}-${Number(y) + 1}`; };

// Dạy thay gắn với LỚP HỌC PHẦN; giảng viên chính = giảng viên phụ trách lớp học phần (class_sections.employee_id)
const FROM = `FROM substitute_teachings t
  JOIN class_sections cs ON cs.id = t.section_id
  JOIN subjects sj ON sj.id = cs.subject_id
  LEFT JOIN employees m ON m.id = t.main_employee_id
  JOIN employees s ON s.id = t.substitute_employee_id`;

@Injectable()
export class SubstitutesService {
  constructor(private readonly ds: DataSource) {}

  async options() {
    const classes = await this.ds.query(`SELECT id, class_code AS code, class_name AS name FROM student_classes WHERE is_active = 1 ORDER BY class_code`);
    const secs = await this.ds.query(
      `SELECT cs.id, cs.section_code AS code, sj.subject_name AS name, tm.term_code AS termCode, e.full_name AS lecturerName
       FROM class_sections cs JOIN subjects sj ON sj.id = cs.subject_id JOIN terms tm ON tm.id = cs.term_id
       LEFT JOIN employees e ON e.id = cs.employee_id
       WHERE cs.is_active = 1 AND cs.deleted_at IS NULL ORDER BY tm.term_code DESC, cs.section_code`);
    const sections = secs.map((r: any) => ({ id: Number(r.id), code: r.code, name: r.name, termLabel: termShort(r.termCode), lecturerName: r.lecturerName }));
    const employees = await this.ds.query(`SELECT id, employee_code AS code, full_name AS name FROM employees WHERE is_active = 1 ORDER BY employee_code`);
    return { classes, sections, employees };
  }

  async list(q: any) {
    const w: string[] = []; const p: any[] = [];
    if (q.sectionId) { w.push('t.section_id = ?'); p.push(+q.sectionId); }
    if (q.employeeId) { w.push('t.substitute_employee_id = ?'); p.push(+q.employeeId); }
    if (STATUS.includes(q.status)) { w.push('t.status = ?'); p.push(q.status); }
    if (DATE_RE.test(q.date ?? '')) { w.push('t.teaching_date = ?'); p.push(q.date); }
    if (q.search) {
      const k = `%${q.search}%`;
      w.push('(cs.section_code LIKE ? OR sj.subject_name LIKE ? OR s.full_name LIKE ? OR m.full_name LIKE ? OR t.note LIKE ?)');
      p.push(k, k, k, k, k);
    }
    const rows = await this.ds.query(
      `SELECT t.id, DATE_FORMAT(t.teaching_date, '%Y-%m-%d') AS date, cs.section_code AS sectionCode, sj.subject_name AS subjectName,
              m.full_name AS mainName, s.full_name AS subName, t.status, t.note
       ${FROM} ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
       ORDER BY t.teaching_date DESC, t.id DESC LIMIT 500`, p);
    return { items: rows.map((r: any) => ({ ...r, id: Number(r.id) })), total: rows.length };
  }

  private period(q: any) {
    const now = new Date();
    const month = +q.month >= 1 && +q.month <= 12 ? +q.month : now.getMonth() + 1;
    const year = +q.year >= 2000 ? +q.year : now.getFullYear();
    return { month, year };
  }

  /** Mỗi giáo viên mỗi ngày chỉ tính 1 ngày công, dù dạy thay nhiều lớp trong ngày đó. */
  async workdays(q: any) {
    const { month, year } = this.period(q);
    const w = [`t.status = 'completed'`, 'MONTH(t.teaching_date) = ?', 'YEAR(t.teaching_date) = ?'];
    const p: any[] = [month, year];
    if (q.employeeId) { w.push('t.substitute_employee_id = ?'); p.push(+q.employeeId); }
    const where = 'WHERE ' + w.join(' AND ');
    const summary = await this.ds.query(
      `SELECT s.id AS employeeId, s.employee_code AS code, s.full_name AS name, COUNT(DISTINCT t.teaching_date) AS days
       ${FROM} ${where} GROUP BY s.id, s.employee_code, s.full_name ORDER BY days DESC, s.full_name`, p);
    const details = await this.ds.query(
      `SELECT DATE_FORMAT(t.teaching_date, '%Y-%m-%d') AS date, s.full_name AS subName, cs.section_code AS sectionCode,
              m.full_name AS mainName, t.note
       ${FROM} ${where} ORDER BY t.teaching_date, s.full_name`, p);
    return {
      month, year, total: summary.reduce((a: number, r: any) => a + Number(r.days), 0),
      summary: summary.map((r: any) => ({ ...r, employeeId: Number(r.employeeId), days: Number(r.days) })), details,
    };
  }

  async stats(q: any) {
    const [r] = await this.ds.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'completed'), 0) AS completed, COALESCE(SUM(status = 'assigned'), 0) AS assigned
       FROM substitute_teachings`);
    const w = await this.workdays(q);
    return { total: Number(r.total), completed: Number(r.completed), assigned: Number(r.assigned), workdays: w.total, month: w.month, year: w.year };
  }

  /** Lịch sử đổi CVHT: suy ra từ bảng advisor_classe_sections (so phân công liền trước của cùng lớp). */
  async changes(q: any) {
    const p: any[] = [];
    let cls = '';
    if (q.classId) { cls = 'AND a.student_class_id = ?'; p.push(+q.classId); }
    const rows = await this.ds.query(
      `SELECT a.id, c.class_code AS classCode, e0.employee_code AS oldCode, e0.full_name AS oldName,
              e1.employee_code AS newCode, e1.full_name AS newName, DATE_FORMAT(a.start_date, '%Y-%m-%d') AS date
       FROM (SELECT x.*, LAG(x.employee_id) OVER (PARTITION BY x.student_class_id ORDER BY x.start_date, x.id) AS prev_emp
             FROM advisor_classe_sections x) a
       JOIN student_classes c ON c.id = a.student_class_id
       JOIN employees e1 ON e1.id = a.employee_id
       JOIN employees e0 ON e0.id = a.prev_emp
       WHERE a.prev_emp IS NOT NULL AND a.prev_emp <> a.employee_id ${cls}
       ORDER BY a.start_date DESC, a.id DESC`, p);
    return { items: rows.map((r: any) => ({ ...r, id: Number(r.id) })), total: rows.length };
  }

  async create(b: any) {
    const sectionId = +b?.sectionId, subId = +b?.substituteEmployeeId, date = b?.teachingDate;
    const note = b?.note ? String(b.note).trim().slice(0, 255) : null;
    if (!sectionId || !subId || !DATE_RE.test(date ?? '')) throw new BadRequestException('Vui lòng chọn lớp học phần, giáo viên dạy thay và ngày dạy');
    const [sec] = await this.ds.query(
      `SELECT cs.employee_id AS mainId, (? BETWEEN tm.start_date AND tm.end_date) AS inTerm
       FROM class_sections cs JOIN terms tm ON tm.id = cs.term_id WHERE cs.id = ? AND cs.deleted_at IS NULL`, [date, sectionId]);
    if (!sec) throw new NotFoundException('Không tìm thấy lớp học phần');
    if (!Number(sec.inTerm)) throw new BadRequestException('Ngày dạy nằm ngoài thời gian của học kỳ chứa lớp học phần này');
    const [sub] = await this.ds.query(`SELECT id FROM employees WHERE id = ? AND is_active = 1`, [subId]);
    if (!sub) throw new NotFoundException('Không tìm thấy giáo viên dạy thay');
    const mainId = sec.mainId === null ? null : Number(sec.mainId);
    if (mainId === subId) throw new BadRequestException('Giáo viên dạy thay phải khác giảng viên phụ trách lớp học phần');
    const [dup] = await this.ds.query(
      `SELECT 1 AS x FROM substitute_teachings WHERE section_id = ? AND teaching_date = ? AND substitute_employee_id = ?`, [sectionId, date, subId]);
    if (dup) throw new ConflictException('Giáo viên này đã được phân công dạy thay lớp học phần này trong ngày đó');
    const r = await this.ds.query(
      `INSERT INTO substitute_teachings (section_id, main_employee_id, substitute_employee_id, teaching_date, note) VALUES (?, ?, ?, ?, ?)`,
      [sectionId, mainId, subId, date, note]);
    return { id: Number(r.insertId) };
  }

  async complete(id: number) {
    const [t] = await this.ds.query(`SELECT status FROM substitute_teachings WHERE id = ?`, [id]);
    if (!t) throw new NotFoundException('Không tìm thấy phân công dạy thay');
    await this.ds.query(`UPDATE substitute_teachings SET status = 'completed' WHERE id = ?`, [id]);
    return { id, status: 'completed' };
  }

  async remove(id: number) {
    const r = await this.ds.query(`DELETE FROM substitute_teachings WHERE id = ?`, [id]);
    if (!Number(r.affectedRows)) throw new NotFoundException('Không tìm thấy phân công dạy thay');
    return { id };
  }
}