import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { PrerequisiteDto } from './dto/prerequisite.dto';

const SELECT_SQL = `
  SELECT c.id, c.course_code AS code, c.name, c.description, c.department, c.category,
         c.theory_credits AS theoryCredits, c.practice_credits AS practiceCredits, c.credits,
         c.is_required AS isRequired, c.w_attendance AS wAttendance, c.w_assignment AS wAssignment,
         c.w_midterm AS wMidterm, c.w_final AS wFinal, c.syllabus_approved AS syllabusApproved, c.status,
         (SELECT COUNT(*) FROM course_prerequisites p WHERE p.course_id = c.id) AS prerequisiteCount
  FROM courses c`;

@Injectable()
export class CoursesService {
  constructor(private readonly ds: DataSource) {}

  private fix(r: any) {
    return { ...r, isRequired: !!r.isRequired, syllabusApproved: !!r.syllabusApproved, prerequisiteCount: Number(r.prerequisiteCount) };
  }

  async options() {
    const rows = await this.ds.query(`SELECT DISTINCT department FROM courses ORDER BY department`);
    const courses = await this.ds.query(`SELECT id, course_code AS code, name FROM courses WHERE status = 'active' ORDER BY course_code`);
    return { departments: rows.map((r: any) => r.department), courses };
  }

  async stats() {
    const [r] = await this.ds.query(
      `SELECT COUNT(*) AS total, SUM(status = 'active') AS active, SUM(syllabus_approved = 1) AS approved,
              (SELECT COUNT(DISTINCT course_id) FROM course_prerequisites) AS withPrereq FROM courses`);
    return { total: Number(r.total), active: Number(r.active ?? 0), approved: Number(r.approved ?? 0), withPrereq: Number(r.withPrereq ?? 0) };
  }

  async findAll(q: QueryCourseDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const where = ['1=1'];
    const params: any[] = [];
    if (q.search) {
      const k = `%${q.search}%`;
      where.push('(c.course_code LIKE ? OR c.name LIKE ? OR c.department LIKE ?)');
      params.push(k, k, k);
    }
    if (q.department) { where.push('c.department = ?'); params.push(q.department); }
    if (q.category) { where.push('c.category = ?'); params.push(q.category); }
    if (q.status) { where.push('c.status = ?'); params.push(q.status); }
    if (q.credits) { where.push('c.credits = ?'); params.push(q.credits); }
    const w = ' WHERE ' + where.join(' AND ');
    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total FROM courses c ${w}`, params);
    const items = await this.ds.query(`${SELECT_SQL} ${w} ORDER BY c.course_code LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { items: items.map((r: any) => this.fix(r)), total: Number(total), page, limit };
  }

  async findOne(id: number) {
    const [row] = await this.ds.query(`${SELECT_SQL} WHERE c.id = ?`, [id]);
    if (!row) throw new NotFoundException('Không tìm thấy môn học');
    const prerequisites = await this.ds.query(
      `SELECT p.id, p.prerequisite_id AS courseId, pc.course_code AS code, pc.name, p.type
       FROM course_prerequisites p JOIN courses pc ON pc.id = p.prerequisite_id
       WHERE p.course_id = ? ORDER BY p.type, pc.course_code`, [id]);
    return { ...this.fix(row), prerequisites };
  }

  async create(dto: CreateCourseDto) {
    const v = this.validate({ wAttendance: 10, wAssignment: 20, wMidterm: 20, wFinal: 50, isRequired: true, syllabusApproved: false, status: 'active', ...this.defined(dto) });
    await this.assertCodeFree(v.code);
    try {
      const res = await this.ds.query(
        `INSERT INTO courses (course_code, name, description, department, category, theory_credits, practice_credits, credits,
           is_required, w_attendance, w_assignment, w_midterm, w_final, syllabus_approved, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [v.code, v.name, v.description ?? null, v.department, v.category, v.theoryCredits, v.practiceCredits, v.credits,
         +v.isRequired, v.wAttendance, v.wAssignment, v.wMidterm, v.wFinal, +v.syllabusApproved, v.status]);
      return this.findOne(res.insertId);
    } catch (e) { this.rethrow(e); }
  }

  async update(id: number, dto: UpdateCourseDto) {
    const cur: any = await this.findOne(id);
    const v = this.validate({ ...cur, ...this.defined(dto) });
    if (v.code !== cur.code) await this.assertCodeFree(v.code, id);
    try {
      await this.ds.query(
        `UPDATE courses SET course_code=?, name=?, description=?, department=?, category=?, theory_credits=?, practice_credits=?, credits=?,
           is_required=?, w_attendance=?, w_assignment=?, w_midterm=?, w_final=?, syllabus_approved=?, status=? WHERE id=?`,
        [v.code, v.name, v.description ?? null, v.department, v.category, v.theoryCredits, v.practiceCredits, v.credits,
         +v.isRequired, v.wAttendance, v.wAssignment, v.wMidterm, v.wFinal, +v.syllabusApproved, v.status, id]);
      return this.findOne(id);
    } catch (e) { this.rethrow(e); }
  }

  async addPrerequisite(id: number, dto: PrerequisiteDto) {
    await this.findOne(id);
    if (dto.prerequisiteId === id) throw new BadRequestException('Môn học không thể là điều kiện của chính nó');
    const [pre] = await this.ds.query(`SELECT id FROM courses WHERE id = ?`, [dto.prerequisiteId]);
    if (!pre) throw new BadRequestException('Môn điều kiện không tồn tại');
    const [dup] = await this.ds.query(`SELECT id FROM course_prerequisites WHERE course_id = ? AND prerequisite_id = ?`, [id, dto.prerequisiteId]);
    if (dup) throw new ConflictException('Điều kiện này đã tồn tại');
    // Chặn vòng lặp: môn điều kiện không được (gián tiếp) yêu cầu lại chính môn này
    const [cycle] = await this.ds.query(
      `WITH RECURSIVE anc(id) AS (
         SELECT prerequisite_id FROM course_prerequisites WHERE course_id = ?
         UNION SELECT p.prerequisite_id FROM course_prerequisites p JOIN anc ON p.course_id = anc.id)
       SELECT 1 AS x FROM anc WHERE id = ? LIMIT 1`, [dto.prerequisiteId, id]);
    if (cycle) throw new ConflictException('Tạo vòng lặp điều kiện: môn kia đã yêu cầu môn này (trực tiếp hoặc gián tiếp)');
    await this.ds.query(`INSERT INTO course_prerequisites (course_id, prerequisite_id, type) VALUES (?, ?, ?)`, [id, dto.prerequisiteId, dto.type]);
    return this.findOne(id);
  }

  async removePrerequisite(id: number, preId: number) {
    await this.ds.query(`DELETE FROM course_prerequisites WHERE id = ? AND course_id = ?`, [preId, id]);
    return this.findOne(id);
  }

  private defined(o: object) {
    return Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));
  }

  private validate(v: any) {
    const credits = Number(v.theoryCredits) + Number(v.practiceCredits);
    if (credits < 1) throw new BadRequestException('Số tín chỉ phải lớn hơn 0');
    const sum = v.wAttendance + v.wAssignment + v.wMidterm + v.wFinal;
    if (sum !== 100) throw new BadRequestException(`Tổng trọng số điểm phải bằng 100 (hiện là ${sum})`);
    return { ...v, credits };
  }

  private async assertCodeFree(code: string, exceptId = 0) {
    const [d] = await this.ds.query(`SELECT id FROM courses WHERE course_code = ? AND id <> ?`, [code, exceptId]);
    if (d) throw new ConflictException(`Mã học phần ${code} đã tồn tại`);
  }

  private rethrow(e: any): never {
    if (e?.errno === 1062) throw new ConflictException('Mã học phần đã tồn tại');
    throw e;
  }
}
