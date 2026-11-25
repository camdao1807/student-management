import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** terms.term_code '2026-1' → 'Học kỳ 1 • 2026-2027' */
const termLabel = (code: string) => { const [y, n] = code.split('-'); return `Học kỳ ${n} • ${y}-${Number(y) + 1}`; };

/** Học kỳ + giảng viên phụ trách của từng môn (lưu ở courses.term_id, courses.lecturer_id). */
@Injectable()
export class CourseTeachingsService {
  constructor(private readonly ds: DataSource) {}

  async list() {
    const rows = await this.ds.query(
      `SELECT c.id AS courseId, c.term_id AS termId, t.term_code AS termCode,
              c.lecturer_id AS lecturerId, e.employee_code AS lecturerCode, e.full_name AS lecturerName
       FROM courses c LEFT JOIN terms t ON t.id = c.term_id LEFT JOIN employees e ON e.id = c.lecturer_id`);
    return rows.map((r: any) => ({
      courseId: Number(r.courseId), termId: r.termId === null ? null : Number(r.termId),
      termLabel: r.termCode ? termLabel(r.termCode) : null,
      lecturerId: r.lecturerId === null ? null : Number(r.lecturerId), lecturerCode: r.lecturerCode, lecturerName: r.lecturerName,
    }));
  }

  async options() {
    const terms = await this.ds.query(`SELECT id, term_code AS code FROM terms ORDER BY term_code DESC`);
    const employees = await this.ds.query(`SELECT id, employee_code AS code, full_name AS name FROM employees WHERE is_active = 1 ORDER BY employee_code`);
    return { terms: terms.map((t: any) => ({ id: Number(t.id), label: termLabel(t.code) })), employees };
  }

  async update(courseId: number, b: any) {
    const [c] = await this.ds.query(`SELECT id FROM courses WHERE id = ?`, [courseId]);
    if (!c) throw new NotFoundException('Không tìm thấy môn học');
    const termId = b?.termId ? Number(b.termId) : null;
    const lecturerId = b?.lecturerId ? Number(b.lecturerId) : null;
    if (termId) { const [t] = await this.ds.query(`SELECT id FROM terms WHERE id = ?`, [termId]); if (!t) throw new BadRequestException('Học kỳ không tồn tại'); }
    if (lecturerId) { const [e] = await this.ds.query(`SELECT id FROM employees WHERE id = ?`, [lecturerId]); if (!e) throw new BadRequestException('Giảng viên không tồn tại'); }
    await this.ds.query(`UPDATE courses SET term_id = ?, lecturer_id = ? WHERE id = ?`, [termId, lecturerId, courseId]);
    return { courseId, termId, lecturerId };
  }
}
