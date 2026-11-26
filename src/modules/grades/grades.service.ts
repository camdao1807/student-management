import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryGradeDto } from './dto/query-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { EnrollGradeDto } from './dto/enroll-grade.dto';
import { LockGradeDto } from './dto/lock-grade.dto';
import {
  DEFAULT_WEIGHTS, FAIL_ATTENDANCE, LETTER_GPA, toLetter, toTermCode, toTermLabel,
} from './grades.constants';

/**
 * Mô hình dữ liệu:
 *   grades.enrollment_id → enrollments(student_id, section_id)
 *   enrollments.section_id → class_sections(subject_id, term_id)
 *   class_sections.subject_id → subjects, class_sections.term_id → terms
 * "courseId" mà frontend gửi lên chính là subjects.id.
 */

// Thang 4 suy ra từ điểm chữ (bảng grades không có cột gpa4)
const GPA_CASE = `CASE g.letter_grade ${Object.entries(LETTER_GPA).map(([l, p]) => `WHEN '${l}' THEN ${p}`).join(' ')} END`;

const FROM_SHEET = `
  FROM grades g
  JOIN enrollments e ON e.id = g.enrollment_id AND e.status <> 'dropped'
  JOIN class_sections cs ON cs.id = e.section_id
  JOIN terms t ON t.id = cs.term_id
  JOIN students s ON s.id = e.student_id`;

const BASE_WHERE = `cs.subject_id = ? AND t.term_code = ? AND s.deleted_at IS NULL`;

const ROW_SQL = `
  SELECT g.id, s.id AS studentId, s.student_code AS studentCode, s.full_name AS fullName, s.gender,
         DATE_FORMAT(s.date_of_birth, '%d/%m/%Y') AS dob, c.class_code AS classCode,
         g.attendance_score AS attendance, g.assignment_score AS assignment, g.midterm_score AS midterm,
         g.final_score AS finalExam, g.total_score AS total10, g.letter_grade AS letter,
         ${GPA_CASE} AS gpa4, g.is_locked AS isLocked,
         (g.attendance_score IS NOT NULL AND g.attendance_score < ${FAIL_ATTENDANCE}) AS banned
  ${FROM_SHEET}
  JOIN student_classes c ON c.id = s.class_id`;

@Injectable()
export class GradesService {
  constructor(private readonly ds: DataSource) {}

  private num(x: any): number | null { return x === null || x === undefined ? null : Number(x); }

  private mapRow = (r: any) => ({
    id: Number(r.id), studentId: Number(r.studentId), studentCode: r.studentCode, fullName: r.fullName,
    gender: r.gender, dob: r.dob, classCode: r.classCode,
    attendance: this.num(r.attendance), assignment: this.num(r.assignment), midterm: this.num(r.midterm),
    finalExam: this.num(r.finalExam), total10: this.num(r.total10), letter: r.letter ?? null,
    gpa4: this.num(r.gpa4), isLocked: !!r.isLocked, banned: !!Number(r.banned),
  });

  private termCode(label: string): string {
    const code = toTermCode(label);
    if (!code) throw new BadRequestException('Học kỳ không hợp lệ');
    return code;
  }

  async options() {
    const courses = await this.ds.query(
      `SELECT id, subject_code AS code, subject_name AS name FROM subjects
       WHERE is_active = 1 AND deleted_at IS NULL ORDER BY subject_code`);
    const classes = await this.ds.query(
      `SELECT id, class_code AS code, class_name AS name FROM student_classes WHERE is_active = 1 ORDER BY class_code`);
    const terms = await this.ds.query(`SELECT term_code, is_current FROM terms ORDER BY term_code`);
    const current = terms.find((t: any) => Number(t.is_current)) ?? terms[terms.length - 1];
    return {
      courses, classes,
      terms: terms.map((t: any) => toTermLabel(t.term_code)),
      currentTerm: current ? toTermLabel(current.term_code) : '',
    };
  }

  private async getCourse(id: number) {
    const [c] = await this.ds.query(
      `SELECT id, subject_code AS code, subject_name AS name, credits FROM subjects WHERE id = ? AND deleted_at IS NULL`, [id]);
    if (!c) throw new NotFoundException('Không tìm thấy môn học');
    return { ...c, ...DEFAULT_WEIGHTS };
  }

  async sheet(q: QueryGradeDto) {
    const course = await this.getCourse(q.courseId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where = [BASE_WHERE];
    const params: any[] = [q.courseId, this.termCode(q.term)];
    if (q.search) {
      where.push('(s.student_code LIKE ? OR s.full_name LIKE ?)');
      params.push(`%${q.search}%`, `%${q.search}%`);
    }
    const groups: Record<string, string> = {
      A: `g.letter_grade = 'A'`, B: `g.letter_grade IN ('B+','B')`, C: `g.letter_grade IN ('C+','C')`,
      D: `g.letter_grade IN ('D+','D')`, F: `g.letter_grade = 'F'`, none: `g.letter_grade IS NULL`,
    };
    if (q.grade && groups[q.grade]) where.push(groups[q.grade]);
    const w = 'WHERE ' + where.join(' AND ');
    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total ${FROM_SHEET} ${w}`, params);
    const rows = await this.ds.query(`${ROW_SQL} ${w} ORDER BY s.student_code LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { course, items: rows.map(this.mapRow), total: Number(total), page, limit, summary: await this.summary(q) };
  }

  /** Thống kê toàn bộ bảng điểm của môn + học kỳ (không phụ thuộc bộ lọc/phân trang). */
  async summary(q: Pick<QueryGradeDto, 'courseId' | 'term'>) {
    const p = [q.courseId, this.termCode(q.term)];
    const [r] = await this.ds.query(
      `SELECT COUNT(*) AS total, SUM(g.letter_grade IS NOT NULL) AS graded, AVG(g.total_score) AS avg10,
              AVG(${GPA_CASE}) AS avg4, SUM(g.letter_grade IS NOT NULL AND g.letter_grade <> 'F') AS passed,
              MAX(g.is_locked) AS locked
       ${FROM_SHEET} WHERE ${BASE_WHERE}`, p);
    const dist = await this.ds.query(
      `SELECT CASE WHEN g.letter_grade = 'A' THEN 'A' WHEN g.letter_grade IN ('B+','B') THEN 'B'
                   WHEN g.letter_grade IN ('C+','C') THEN 'C' WHEN g.letter_grade IN ('D+','D') THEN 'D' ELSE 'F' END AS grp,
              COUNT(*) AS n
       ${FROM_SHEET} WHERE ${BASE_WHERE} AND g.letter_grade IS NOT NULL GROUP BY grp`, p);
    const total = Number(r.total);
    const graded = Number(r.graded ?? 0);
    return {
      total, graded, missing: total - graded,
      avg10: r.avg10 === null ? null : Math.round(Number(r.avg10) * 100) / 100,
      avg4: r.avg4 === null ? null : Math.round(Number(r.avg4) * 100) / 100,
      passRate: graded ? Math.round((Number(r.passed) / graded) * 1000) / 10 : null,
      locked: total > 0 && !!Number(r.locked ?? 0),
      distribution: ['A', 'B', 'C', 'D', 'F'].map((g) => ({ group: g, count: Number(dist.find((d: any) => d.grp === g)?.n ?? 0) })),
    };
  }

  /** Điểm trung bình theo từng học kỳ (một môn hoặc toàn bộ các môn) để theo dõi qua thời gian. */
  async trend(courseId?: number) {
    const p: any[] = [];
    let w = 's.deleted_at IS NULL';
    if (courseId) { w += ' AND cs.subject_id = ?'; p.push(courseId); }
    const rows = await this.ds.query(
      `SELECT t.term_code AS code, COUNT(*) AS total, SUM(g.letter_grade IS NOT NULL) AS graded, AVG(g.total_score) AS avg10,
              AVG(${GPA_CASE}) AS avg4, SUM(g.letter_grade IS NOT NULL AND g.letter_grade <> 'F') AS passed
       ${FROM_SHEET} WHERE ${w} GROUP BY t.id, t.term_code ORDER BY t.term_code`, p);
    const r2 = (x: any) => (x === null || x === undefined ? null : Math.round(Number(x) * 100) / 100);
    return {
      scope: courseId ? 'subject' : 'all',
      items: rows.map((r: any) => {
        const graded = Number(r.graded ?? 0);
        return { term: toTermLabel(r.code), total: Number(r.total), graded, avg10: r2(r.avg10), avg4: r2(r.avg4),
                 passRate: graded ? Math.round((Number(r.passed) / graded) * 1000) / 10 : null };
      }),
    };
  }

  async update(id: number, dto: UpdateGradeDto) {
    const [g] = await this.ds.query(`SELECT * FROM grades WHERE id = ?`, [id]);
    if (!g) throw new NotFoundException('Không tìm thấy dòng điểm');
    if (g.is_locked) throw new ConflictException('Sổ điểm đã khóa, không thể sửa điểm');
    const pick = (v: number | null | undefined, col: string) => (v !== undefined ? v : this.num(g[col]));
    const v = {
      attendance: pick(dto.attendance, 'attendance_score'), assignment: pick(dto.assignment, 'assignment_score'),
      midterm: pick(dto.midterm, 'midterm_score'), finalExam: pick(dto.finalExam, 'final_score'),
    };
    const r = this.compute(
      { a: DEFAULT_WEIGHTS.wAttendance, s: DEFAULT_WEIGHTS.wAssignment, m: DEFAULT_WEIGHTS.wMidterm, f: DEFAULT_WEIGHTS.wFinal }, v);
    const passed = r.letter === null ? null : r.letter === 'F' ? 0 : 1;
    await this.ds.query(
      `UPDATE grades SET attendance_score = ?, assignment_score = ?, midterm_score = ?, final_score = ?,
              total_score = ?, letter_grade = ?, is_passed = ? WHERE id = ?`,
      [v.attendance, v.assignment, v.midterm, v.finalExam, r.total, r.letter, passed, id]);
    const [row] = await this.ds.query(`${ROW_SQL} WHERE g.id = ?`, [id]);
    return this.mapRow(row);
  }

  /** TK10 = CC*w1 + BT*w2 + GK*w3 + CK*w4. Chuyên cần < 5.0 → cấm thi, CK tính 0, điểm F. */
  private compute(w: { a: number; s: number; m: number; f: number },
                  v: { attendance: number | null; assignment: number | null; midterm: number | null; finalExam: number | null }) {
    const banned = v.attendance !== null && v.attendance < FAIL_ATTENDANCE;
    const done = v.attendance !== null && v.assignment !== null && v.midterm !== null && (v.finalExam !== null || banned);
    if (!done) return { total: null, letter: null, gpa: null };
    const fin = banned ? 0 : (v.finalExam as number);
    const total = Math.round(((v.attendance as number) * w.a + (v.assignment as number) * w.s + (v.midterm as number) * w.m + fin * w.f) / 10) / 10;
    const [letter, gpa] = banned ? ['F', 0] : toLetter(total);
    return { total, letter, gpa };
  }

  /**
   * Thêm sinh viên đang học của một lớp hành chính vào bảng điểm môn/học kỳ:
   *  1. tạo đăng ký học phần (enrollments) vào lớp học phần đầu tiên của môn trong học kỳ đó,
   *     bỏ qua sinh viên đã đăng ký môn này ở học kỳ đó (bất kỳ lớp học phần nào);
   *  2. tạo dòng điểm trống (grades) cho các đăng ký chưa có.
   */
  async enroll(dto: EnrollGradeDto) {
    const code = this.termCode(dto.term);
    await this.getCourse(dto.courseId);
    const [term] = await this.ds.query(`SELECT id FROM terms WHERE term_code = ?`, [code]);
    if (!term) throw new NotFoundException('Không tìm thấy học kỳ');

    const [lk] = await this.ds.query(`SELECT 1 AS x ${FROM_SHEET} WHERE ${BASE_WHERE} AND g.is_locked = 1 LIMIT 1`, [dto.courseId, code]);
    if (lk) throw new ConflictException('Sổ điểm đã khóa, không thể thêm sinh viên');

    const [section] = await this.ds.query(
      `SELECT id FROM class_sections WHERE subject_id = ? AND term_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY id LIMIT 1`,
      [dto.courseId, term.id]);
    if (!section) throw new BadRequestException('Môn học này chưa có lớp học phần nào trong học kỳ đã chọn');

    return this.ds.transaction(async (m) => {
      await m.query(
        `INSERT INTO enrollments (student_id, section_id, status)
         SELECT s.id, ?, 'enrolled' FROM students s
         JOIN v_student_current_status vs ON vs.student_id = s.id AND vs.status = 'studying'
         WHERE s.class_id = ? AND s.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM enrollments e2 JOIN class_sections x ON x.id = e2.section_id
             WHERE e2.student_id = s.id AND x.subject_id = ? AND x.term_id = ? AND e2.status <> 'dropped')
         ON DUPLICATE KEY UPDATE enrollments.status = 'enrolled'`,
        [section.id, dto.classId, dto.courseId, term.id]);
      const res = await m.query(
        `INSERT INTO grades (enrollment_id)
         SELECT e.id FROM enrollments e
         JOIN class_sections x ON x.id = e.section_id
         JOIN students s ON s.id = e.student_id
         WHERE x.subject_id = ? AND x.term_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
           AND e.status <> 'dropped'
           AND NOT EXISTS (SELECT 1 FROM grades g2 WHERE g2.enrollment_id = e.id)`,
        [dto.courseId, term.id, dto.classId]);
      return { added: Number(res.affectedRows ?? 0) };
    });
  }

  async lock(dto: LockGradeDto) {
    const code = this.termCode(dto.term);
    if (dto.locked) {
      const s = await this.summary(dto);
      if (s.total === 0) throw new BadRequestException('Bảng điểm chưa có sinh viên nào');
      if (s.missing > 0) throw new BadRequestException(`Còn ${s.missing} sinh viên chưa đủ điểm, chưa thể khóa sổ`);
    }
    await this.ds.query(
      `UPDATE grades g
       JOIN enrollments e ON e.id = g.enrollment_id
       JOIN class_sections cs ON cs.id = e.section_id
       JOIN terms t ON t.id = cs.term_id
       SET g.is_locked = ?
       WHERE cs.subject_id = ? AND t.term_code = ? AND e.status <> 'dropped'`,
      [+dto.locked, dto.courseId, code]);
    return this.summary(dto);
  }
}