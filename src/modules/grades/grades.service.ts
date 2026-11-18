import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QueryGradeDto } from './dto/query-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { EnrollGradeDto } from './dto/enroll-grade.dto';
import { LockGradeDto } from './dto/lock-grade.dto';
import { CURRENT_TERM, FAIL_ATTENDANCE, TERMS, toLetter } from './grades.constants';

const ROW_SQL = `
  SELECT g.id, s.id AS studentId, s.student_code AS studentCode, s.full_name AS fullName, s.gender,
         DATE_FORMAT(s.date_of_birth, '%d/%m/%Y') AS dob, c.class_code AS classCode,
         g.attendance, g.assignment, g.midterm, g.final_exam AS finalExam,
         g.total10, g.letter, g.gpa4, g.is_locked AS isLocked,
         (g.attendance IS NOT NULL AND g.attendance < ${FAIL_ATTENDANCE}) AS banned
  FROM grades g
  JOIN students s ON s.id = g.student_id
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
    gpa4: this.num(r.gpa4), isLocked: !!r.isLocked, banned: !!r.banned,
  });

  async options() {
    const courses = await this.ds.query(`SELECT id, course_code AS code, name FROM courses WHERE status = 'active' ORDER BY course_code`);
    const classes = await this.ds.query(`SELECT id, class_code AS code, class_name AS name FROM student_classes WHERE is_active = 1 ORDER BY class_code`);
    return { courses, classes, terms: TERMS, currentTerm: CURRENT_TERM };
  }

  private async getCourse(id: number) {
    const [c] = await this.ds.query(
      `SELECT id, course_code AS code, name, credits, w_attendance AS wAttendance, w_assignment AS wAssignment,
              w_midterm AS wMidterm, w_final AS wFinal FROM courses WHERE id = ?`, [id]);
    if (!c) throw new NotFoundException('Không tìm thấy môn học');
    return c;
  }

  async sheet(q: QueryGradeDto) {
    const course = await this.getCourse(q.courseId);
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where = ['g.course_id = ?', 'g.term = ?', 's.deleted_at IS NULL'];
    const params: any[] = [q.courseId, q.term];
    if (q.search) {
      where.push('(s.student_code LIKE ? OR s.full_name LIKE ?)');
      params.push(`%${q.search}%`, `%${q.search}%`);
    }
    const groups: Record<string, string> = {
      A: `g.letter = 'A'`, B: `g.letter IN ('B+','B')`, C: `g.letter IN ('C+','C')`,
      D: `g.letter IN ('D+','D')`, F: `g.letter = 'F'`, none: `g.letter IS NULL`,
    };
    if (q.grade) where.push(groups[q.grade]);
    const w = 'WHERE ' + where.join(' AND ');
    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total FROM grades g JOIN students s ON s.id = g.student_id ${w}`, params);
    const rows = await this.ds.query(`${ROW_SQL} ${w} ORDER BY s.student_code LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { course, items: rows.map(this.mapRow), total: Number(total), page, limit, summary: await this.summary(q) };
  }

  /** Thống kê toàn bộ bảng điểm của môn + học kỳ (không phụ thuộc bộ lọc/phân trang). */
  async summary(q: Pick<QueryGradeDto, 'courseId' | 'term'>) {
    const base = `FROM grades g JOIN students s ON s.id = g.student_id WHERE g.course_id = ? AND g.term = ? AND s.deleted_at IS NULL`;
    const p = [q.courseId, q.term];
    const [r] = await this.ds.query(
      `SELECT COUNT(*) AS total, SUM(g.letter IS NOT NULL) AS graded, AVG(g.total10) AS avg10, AVG(g.gpa4) AS avg4,
              SUM(g.letter IS NOT NULL AND g.letter <> 'F') AS passed, MAX(g.is_locked) AS locked ${base}`, p);
    const dist = await this.ds.query(
      `SELECT CASE WHEN g.letter = 'A' THEN 'A' WHEN g.letter IN ('B+','B') THEN 'B' WHEN g.letter IN ('C+','C') THEN 'C'
                   WHEN g.letter IN ('D+','D') THEN 'D' ELSE 'F' END AS grp, COUNT(*) AS n
       ${base} AND g.letter IS NOT NULL GROUP BY grp`, p);
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

  async update(id: number, dto: UpdateGradeDto) {
    const [g] = await this.ds.query(
      `SELECT g.*, c.w_attendance, c.w_assignment, c.w_midterm, c.w_final
       FROM grades g JOIN courses c ON c.id = g.course_id WHERE g.id = ?`, [id]);
    if (!g) throw new NotFoundException('Không tìm thấy dòng điểm');
    if (g.is_locked) throw new ConflictException('Sổ điểm đã khóa, không thể sửa điểm');
    const pick = (v: number | null | undefined, col: string) => (v !== undefined ? v : this.num(g[col]));
    const v = {
      attendance: pick(dto.attendance, 'attendance'), assignment: pick(dto.assignment, 'assignment'),
      midterm: pick(dto.midterm, 'midterm'), finalExam: pick(dto.finalExam, 'final_exam'),
    };
    const r = this.compute({ a: g.w_attendance, s: g.w_assignment, m: g.w_midterm, f: g.w_final }, v);
    await this.ds.query(
      `UPDATE grades SET attendance = ?, assignment = ?, midterm = ?, final_exam = ?, total10 = ?, letter = ?, gpa4 = ? WHERE id = ?`,
      [v.attendance, v.assignment, v.midterm, v.finalExam, r.total, r.letter, r.gpa, id]);
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

  /** Thêm toàn bộ sinh viên đang học của một lớp vào bảng điểm môn/học kỳ. */
  async enroll(dto: EnrollGradeDto) {
    await this.getCourse(dto.courseId);
    const [lk] = await this.ds.query(`SELECT 1 AS x FROM grades WHERE course_id = ? AND term = ? AND is_locked = 1 LIMIT 1`, [dto.courseId, dto.term]);
    if (lk) throw new ConflictException('Sổ điểm đã khóa, không thể thêm sinh viên');
    const res = await this.ds.query(
      `INSERT IGNORE INTO grades (student_id, course_id, term)
       SELECT s.id, ?, ? FROM students s
       JOIN v_student_current_status cs ON cs.student_id = s.id AND cs.status = 'studying'
       WHERE s.class_id = ? AND s.deleted_at IS NULL`, [dto.courseId, dto.term, dto.classId]);
    return { added: Number(res.affectedRows ?? 0) };
  }

  async lock(dto: LockGradeDto) {
    if (dto.locked) {
      const s = await this.summary(dto);
      if (s.total === 0) throw new BadRequestException('Bảng điểm chưa có sinh viên nào');
      if (s.missing > 0) throw new BadRequestException(`Còn ${s.missing} sinh viên chưa đủ điểm, chưa thể khóa sổ`);
    }
    await this.ds.query(`UPDATE grades SET is_locked = ? WHERE course_id = ? AND term = ?`, [+dto.locked, dto.courseId, dto.term]);
    return this.summary(dto);
  }
}
