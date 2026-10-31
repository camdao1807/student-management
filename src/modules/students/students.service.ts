import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Student } from '../../entities/student.entity';
import { StudentClass } from '../../entities/student-class.entity';
import {
  StudentStatus,
  StudentStatusValue,
} from '../../entities/student-status.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { todayStr } from './validators/is-not-future-date';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(StudentClass)
    private readonly classRepo: Repository<StudentClass>,
    @InjectRepository(StudentStatus)
    private readonly statusRepo: Repository<StudentStatus>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------- Kiểm tra mã trùng (tính cả hồ sơ đã lưu trữ) ----------
  async isCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
    const qb = this.studentRepo
      .createQueryBuilder('s')
      .withDeleted()
      .where('s.studentCode = :code', { code });
    if (excludeId) qb.andWhere('s.id <> :excludeId', { excludeId });
    return (await qb.getCount()) === 0;
  }

  private async assertCodeAvailable(code: string, excludeId?: string) {
    if (!(await this.isCodeAvailable(code, excludeId))) {
      throw new ConflictException(
        `Mã sinh viên "${code}" đã tồn tại (có thể ở hồ sơ đã lưu trữ)`,
      );
    }
  }

  private async assertClassUsable(classId: string) {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls)
      throw new BadRequestException(`Lớp có id=${classId} không tồn tại`);
    if (!cls.isActive)
      throw new BadRequestException(
        `Lớp "${cls.classCode}" đã ngừng hoạt động`,
      );
  }

  private rethrowDuplicate(e: any): never {
    if (e?.code === 'ER_DUP_ENTRY')
      throw new ConflictException('Mã sinh viên đã tồn tại');
    if (e?.code === 'ER_CHECK_CONSTRAINT_VIOLATED')
      throw new BadRequestException('Dữ liệu vi phạm ràng buộc CHECK');
    if (e?.sqlState === '45000') throw new BadRequestException(e.sqlMessage);
    throw e;
  }

  // ---------- Thêm mới ----------
  async create(dto: CreateStudentDto, userId: string | null) {
    await this.assertCodeAvailable(dto.studentCode);
    await this.assertClassUsable(dto.classId);

    try {
      const saved = await this.dataSource.transaction(async (em) => {
        const student = await em.save(
          em.create(Student, {
            studentCode: dto.studentCode,
            fullName: dto.fullName,
            dateOfBirth: dto.dateOfBirth,
            gender: dto.gender ?? null,
            email: dto.email,
            phone: dto.phone ?? null,
            classId: dto.classId,
          }),
        );
        // Mỗi sinh viên mới có bản ghi trạng thái đầu tiên: đang học
        await em.save(
          em.create(StudentStatus, {
            studentId: student.id,
            status: StudentStatusValue.STUDYING,
            reason: 'Nhập học',
            effectiveDate: todayStr(),
            createdBy: userId,
          }),
        );
        return student;
      });
      return this.findOne(saved.id);
    } catch (e) {
      this.rethrowDuplicate(e);
    }
  }

  // ---------- Danh sách: tìm kiếm + lọc + phân trang ----------
  async findAll(query: QueryStudentDto) {
    const {
      q,
      classId,
      gender,
      status,
      archived,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.studentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.studentClass', 'c');

    if (archived) qb.withDeleted().andWhere('s.deletedAt IS NOT NULL');

    if (q?.trim()) {
      qb.andWhere('(s.studentCode LIKE :kw OR s.fullName LIKE :kw)', {
        kw: `%${q.trim()}%`,
      });
    }
    if (classId) qb.andWhere('s.classId = :classId', { classId });
    if (gender) qb.andWhere('s.gender = :gender', { gender });
    if (status) {
      qb.andWhere(
        's.id IN (SELECT v.student_id FROM v_student_current_status v WHERE v.status = :status)',
        { status },
      );
    }

    const [rows, total] = await qb
      .orderBy('s.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: await this.attachCurrentStatus(rows),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async attachCurrentStatus(students: Student[]) {
    if (!students.length) return [];
    const ids = students.map((s) => s.id);
    const rows: {
      student_id: string;
      status: string;
      effective_date: string;
    }[] = await this.dataSource.query(
      `SELECT student_id, status, effective_date
           FROM v_student_current_status
          WHERE student_id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    const map = new Map(rows.map((r) => [String(r.student_id), r]));
    return students.map((s) => ({
      ...s,
      currentStatus: map.get(String(s.id))?.status ?? null,
    }));
  }

  // ---------- Xem chi tiết ----------
  async findOne(id: string, withArchived = false) {
    const student = await this.studentRepo.findOne({
      where: { id },
      relations: { studentClass: true },
      withDeleted: withArchived,
    });
    if (!student)
      throw new NotFoundException(`Không tìm thấy sinh viên id=${id}`);
    const [withStatus] = await this.attachCurrentStatus([student]);
    return withStatus;
  }

  // ---------- Cập nhật hồ sơ ----------
  async update(id: string, dto: UpdateStudentDto) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student)
      throw new NotFoundException(`Không tìm thấy sinh viên id=${id}`);

    if (dto.studentCode && dto.studentCode !== student.studentCode) {
      await this.assertCodeAvailable(dto.studentCode, id);
    }
    if (dto.classId && dto.classId !== student.classId) {
      await this.assertClassUsable(dto.classId);
    }

    try {
      await this.studentRepo.save(Object.assign(student, dto));
    } catch (e) {
      this.rethrowDuplicate(e);
    }
    return this.findOne(id);
  }

  // ---------- Đổi trạng thái (ghi thêm lịch sử, không sửa bản ghi cũ) ----------
  async changeStatus(id: string, dto: ChangeStatusDto, userId: string | null) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student)
      throw new NotFoundException(`Không tìm thấy sinh viên id=${id}`);

    return this.statusRepo.save(
      this.statusRepo.create({
        studentId: id,
        status: dto.status,
        reason: dto.reason ?? null,
        effectiveDate: dto.effectiveDate,
        createdBy: userId,
      }),
    );
  }

  async statusHistory(id: string) {
    await this.findOne(id, true);
    return this.statusRepo.find({
      where: { studentId: id },
      order: { effectiveDate: 'DESC', id: 'DESC' },
    });
  }

  // ---------- Lưu trữ / khôi phục (không xóa dữ liệu) ----------
  async archive(id: string) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student)
      throw new NotFoundException(
        `Không tìm thấy sinh viên id=${id} (hoặc đã lưu trữ)`,
      );
    await this.studentRepo.softDelete(id);
    return { id, archived: true };
  }

  async restore(id: string) {
    const student = await this.studentRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!student)
      throw new NotFoundException(`Không tìm thấy sinh viên id=${id}`);
    if (!student.deletedAt)
      throw new BadRequestException('Hồ sơ này chưa bị lưu trữ');
    await this.studentRepo.restore(id);
    return { id, archived: false };
  }
    // Danh sách lớp để đổ vào ô chọn (chỉ đọc)
  async listClassOptions() {
    return this.classRepo.find({
      where: { isActive: true },
      select: { id: true, classCode: true, className: true, majorName: true },
      order: { majorName: 'ASC', classCode: 'ASC' },
    });
  }
}
