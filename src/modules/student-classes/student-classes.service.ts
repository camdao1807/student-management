import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentClass } from '../../entities/student-class.entity';
import { Student } from '../../entities/student.entity';
import { AdvisorClasseSection } from '../../entities/advisor-classe-section.entity';
import { CreateStudentClassDto } from './dto/create-student-class.dto';
import { UpdateStudentClassDto } from './dto/update-student-class.dto';

@Injectable()
export class StudentClassesService {
  constructor(
    @InjectRepository(StudentClass)
    private readonly classRepo: Repository<StudentClass>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(AdvisorClasseSection)
    private readonly advisorRepo: Repository<AdvisorClasseSection>,
  ) {}

  // ===== LỚP HỌC =====

  // Danh sách lớp kèm sĩ số hiện tại
  async findAll() {
    const classes = await this.classRepo.find({ order: { classCode: 'ASC' } });

    const counts = await this.studentRepo
      .createQueryBuilder('s')
      .select('s.classId', 'classId')
      .addSelect('COUNT(*)', 'total')
      .groupBy('s.classId')
      .getRawMany<{ classId: string; total: string }>();

    const countMap = new Map(counts.map((c) => [String(c.classId), Number(c.total)]));

    return classes.map((c) => ({
      ...c,
      studentCount: countMap.get(String(c.id)) ?? 0,
    }));
  }

  async findOne(id: string) {
    const cls = await this.classRepo.findOneBy({ id });
    if (!cls) throw new NotFoundException('Không tìm thấy lớp');
    return cls;
  }

  async create(dto: CreateStudentClassDto) {
    const exists = await this.classRepo.findOneBy({ classCode: dto.classCode });
    if (exists) throw new ConflictException('Mã lớp đã tồn tại');
    return this.classRepo.save(this.classRepo.create(dto));
  }

  async update(id: string, dto: UpdateStudentClassDto) {
    const cls = await this.findOne(id);

    if (dto.classCode && dto.classCode !== cls.classCode) {
      const exists = await this.classRepo.findOneBy({ classCode: dto.classCode });
      if (exists) throw new ConflictException('Mã lớp đã tồn tại');
    }

    return this.classRepo.save(Object.assign(cls, dto));
  }

  async remove(id: string) {
    await this.findOne(id);

    const studentCount = await this.studentRepo.countBy({ classId: id });
    if (studentCount > 0) {
      throw new BadRequestException(
        `Lớp còn ${studentCount} sinh viên. Hãy chuyển hết sinh viên sang lớp khác rồi mới xóa.`,
      );
    }

    const advisorCount = await this.advisorRepo.countBy({ studentClassId: id });
    if (advisorCount > 0) {
      throw new BadRequestException('Lớp đã có phân công cố vấn nên không thể xóa. Bạn có thể tắt trạng thái hoạt động của lớp.');
    }

    await this.classRepo.delete(id);
    return { deleted: true };
  }

  // ===== PHÂN LỚP =====

  // Sinh viên đang học trong lớp này
  async getStudents(classId: string) {
    await this.findOne(classId);
    return this.studentRepo.find({
      where: { classId },
      select: { id: true, studentCode: true, fullName: true, email: true },
      order: { fullName: 'ASC' },
    });
  }

  // Sinh viên của các lớp khác (để chọn chuyển vào lớp này)
  async getAvailableStudents(classId: string) {
    await this.findOne(classId);
    const students = await this.studentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.studentClass', 'c')
      .where('s.classId != :classId', { classId })
      .orderBy('s.fullName', 'ASC')
      .getMany();

    return students.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      currentClassCode: s.studentClass?.classCode ?? '',
    }));
  }

  // Chuyển 1 hoặc nhiều sinh viên vào lớp này
  async assignStudents(classId: string, studentIds: string[]) {
    const cls = await this.findOne(classId);
    if (!cls.isActive) {
      throw new BadRequestException('Lớp đang bị tắt hoạt động, không thể thêm sinh viên');
    }

    const students = await this.studentRepo.findBy({ id: In(studentIds) });
    if (students.length !== new Set(studentIds).size) {
      throw new NotFoundException('Có sinh viên không tồn tại');
    }

    await this.studentRepo.update({ id: In(studentIds) }, { classId });
    return { moved: students.length };
  }
}