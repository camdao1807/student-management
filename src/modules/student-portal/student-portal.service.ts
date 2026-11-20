import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Student } from '../../entities/student.entity';
import { StudentStatus } from '../../entities/student-status.entity';
import { ClassSection } from '../../entities/class-section.entity';
import { Enrollment, EnrollmentStatus } from '../../entities/enrollment.entity';
import { Grade } from '../../entities/grade.entity';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Thang điểm chữ -> hệ 4
const GPA_SCALE: Record<string, number> = {
  'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 'F': 0,
};

type AttendanceSummary = {
  subjectId: string;
  subject: string;
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  details: { date: string; status: AttendanceStatus; note: string | null }[];
};

@Injectable()
export class StudentPortalService {
  constructor(
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(StudentStatus) private statusRepo: Repository<StudentStatus>,
    @InjectRepository(ClassSection) private sectionRepo: Repository<ClassSection>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
    @InjectRepository(Attendance) private attendanceRepo: Repository<Attendance>,
  ) {}

  // 1. Hồ sơ cá nhân: kèm lớp, ngành và trạng thái học tập hiện tại
  async getProfile(studentId: string) {
    const s = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: { studentClass: true },
    });
    if (!s) throw new NotFoundException('Không tìm thấy sinh viên');

    // Trạng thái hiện tại = dòng mới nhất có ngày hiệu lực không nằm ở tương lai
    const today = new Date().toISOString().slice(0, 10);
    const st = await this.statusRepo.findOne({
      where: { studentId, effectiveDate: LessThanOrEqual(today) },
      order: { effectiveDate: 'DESC', id: 'DESC' },
    });

    const c = s.studentClass;
    return {
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      email: s.email,
      phone: s.phone,
      hometown: s.hometown,
      class: c
        ? {
            id: c.id,
            classCode: c.classCode,
            className: c.className,
            majorName: c.majorName,
            academicYear: c.academicYear,
          }
        : null,
      status: st
        ? { value: st.status, reason: st.reason, effectiveDate: st.effectiveDate }
        : null,
    };
  }

  // 1b. Sinh viên tự chỉnh sửa thông tin cá nhân (chỉ các trường được phép)
  async updateProfile(studentId: string, dto: UpdateProfileDto) {
    const s = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!s) throw new NotFoundException('Không tìm thấy sinh viên');

    if (dto.email && dto.email !== s.email) {
      const dup = await this.studentRepo.findOne({
        where: { email: dto.email, id: Not(studentId) },
      });
      if (dup) throw new BadRequestException('Email đã được sinh viên khác sử dụng');
    }

    if (dto.dateOfBirth !== undefined) s.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) s.gender = dto.gender;
    if (dto.email !== undefined) s.email = dto.email;
    if (dto.phone !== undefined) s.phone = dto.phone;
    if (dto.hometown !== undefined) s.hometown = dto.hometown;

    await this.studentRepo.save(s);
    return this.getProfile(studentId);
  }

  // 2a. Lớp học phần đang mở trong học kỳ: chỉ môn của ngành sinh viên + môn chung (kèm sĩ số hiện tại)
  async getOpenSections(studentId: string, termId: string) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: { studentClass: true },
    });
    if (!student) throw new NotFoundException('Không tìm thấy sinh viên');
    const major = student.studentClass?.majorName;

    const where: FindOptionsWhere<ClassSection>[] = [
      { termId, isActive: true, subject: { majorName: IsNull() } }, // môn chung
    ];
    if (major) where.push({ termId, isActive: true, subject: { majorName: major } });

    const sections = await this.sectionRepo.find({
      where,
      relations: { subject: true },
      order: { dayOfWeek: 'ASC', startPeriod: 'ASC' },
    });

    return Promise.all(
      sections.map(async (s) => ({
        ...s,
        enrolledCount: await this.enrollRepo.count({
          where: { sectionId: s.id, status: EnrollmentStatus.ENROLLED },
        }),
      })),
    );
  }

  // 2b. Đăng ký học phần
  async register(studentId: string, sectionId: string) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: { studentClass: true },
    });
    if (!student) throw new NotFoundException('Không tìm thấy sinh viên');

    const section = await this.sectionRepo.findOne({
      where: { id: sectionId, isActive: true },
      relations: { subject: true },
    });
    if (!section) throw new NotFoundException('Lớp học phần không tồn tại');

    // Môn của ngành khác thì không cho đăng ký (môn chung: majorName = null thì ngành nào cũng học được)
    const subjectMajor = section.subject.majorName;
    if (subjectMajor && subjectMajor !== student.studentClass?.majorName) {
      throw new BadRequestException(
        `Môn ${section.subject.subjectName} thuộc ngành ${subjectMajor}, không thuộc ngành của bạn`,
      );
    }

    // Đã đăng ký lớp này chưa? (bảng có unique student + section nên lớp đã hủy sẽ được kích hoạt lại)
    const existed = await this.enrollRepo.findOne({ where: { studentId, sectionId } });
    if (existed?.status === EnrollmentStatus.ENROLLED) {
      throw new BadRequestException('Bạn đã đăng ký lớp này rồi');
    }

    // Kiểm tra sĩ số
    const count = await this.enrollRepo.count({
      where: { sectionId, status: EnrollmentStatus.ENROLLED },
    });
    if (count >= section.maxStudents) {
      throw new BadRequestException('Lớp đã đủ sĩ số');
    }

    // Kiểm tra trùng lịch trong cùng học kỳ
    const { dayOfWeek, startPeriod, endPeriod } = section;
    if (dayOfWeek != null && startPeriod != null && endPeriod != null) {
      const mine = await this.enrollRepo.find({
        where: {
          studentId,
          status: EnrollmentStatus.ENROLLED,
          section: { termId: section.termId },
        },
        relations: { section: true },
      });

      const conflict = mine.find((e) => {
        const c = e.section;
        return (
          c.dayOfWeek === dayOfWeek &&
          c.startPeriod != null &&
          c.endPeriod != null &&
          c.startPeriod <= endPeriod &&
          startPeriod <= c.endPeriod
        );
      });
      if (conflict) {
        throw new BadRequestException(
          `Trùng lịch với lớp ${conflict.section.sectionCode} đã đăng ký`,
        );
      }
    }

    if (existed) {
      existed.status = EnrollmentStatus.ENROLLED;
      return this.enrollRepo.save(existed);
    }
    return this.enrollRepo.save(
      this.enrollRepo.create({ studentId, sectionId, status: EnrollmentStatus.ENROLLED }),
    );
  }

  // 2c. Hủy đăng ký: chuyển status sang DROPPED, không xóa dòng (chỉ hủy được của chính mình)
  async cancel(studentId: string, enrollmentId: string) {
    const e = await this.enrollRepo.findOne({
      where: { id: enrollmentId, studentId, status: EnrollmentStatus.ENROLLED },
      relations: { grade: true },
    });
    if (!e) throw new NotFoundException('Không tìm thấy đăng ký');

    if (e.grade && (e.grade.isLocked || e.grade.totalScore != null)) {
      throw new BadRequestException('Môn đã có điểm, không thể hủy đăng ký');
    }

    await this.enrollRepo.update({ id: e.id }, { status: EnrollmentStatus.DROPPED });
    return { message: 'Đã hủy đăng ký' };
  }

  // 3. Thời khóa biểu (kèm enrollmentId để giao diện có nút hủy)
  async getTimetable(studentId: string, termId: string) {
    const list = await this.enrollRepo.find({
      where: {
        studentId,
        status: EnrollmentStatus.ENROLLED,
        section: { termId },
      },
      relations: { section: { subject: true } },
    });

    return list
      .map((e) => ({ enrollmentId: e.id, ...e.section }))
      .sort(
        (a, b) =>
          (a.dayOfWeek ?? 99) - (b.dayOfWeek ?? 99) ||
          (a.startPeriod ?? 99) - (b.startPeriod ?? 99),
      );
  }

  // 4. Điểm theo môn
  getGrades(studentId: string, termId?: string) {
    return this.gradeRepo.find({
      where: {
        enrollment: {
          studentId,
          status: EnrollmentStatus.ENROLLED,
          ...(termId ? { section: { termId } } : {}),
        },
      },
      relations: { enrollment: { section: { subject: true, term: true } } },
    });
  }

  // 5. Bảng điểm: GPA từng kỳ + tích lũy
  async getTranscript(studentId: string) {
    const grades = await this.getGrades(studentId);

    const byTerm = new Map<
      string,
      { termId: string; termName: string; points: number; credits: number }
    >();
    let totalPoints = 0;
    let totalCredits = 0;
    let passedCredits = 0;

    for (const g of grades) {
      if (g.letterGrade == null) continue; // chưa có điểm chữ thì bỏ qua
      const point = GPA_SCALE[g.letterGrade];
      if (point === undefined) continue;

      const sec = g.enrollment.section;
      const credits = sec.subject.credits;

      const t = byTerm.get(sec.termId) ?? {
        termId: sec.termId,
        termName: this.termLabel(sec.term),
        points: 0,
        credits: 0,
      };
      t.points += point * credits;
      t.credits += credits;
      byTerm.set(sec.termId, t);

      totalPoints += point * credits;
      totalCredits += credits;
      if (g.isPassed) passedCredits += credits;
    }

    const gpa = totalCredits ? +(totalPoints / totalCredits).toFixed(2) : 0;
    return {
      terms: [...byTerm.values()].map((t) => ({
        termId: t.termId,
        term: t.termName,
        gpa: +(t.points / t.credits).toFixed(2),
        credits: t.credits,
      })),
      cumulativeGpa: gpa,
      totalCredits,
      passedCredits,
      classification: this.classify(gpa),
    };
  }

  private classify(gpa: number) {
    if (gpa >= 3.6) return 'Xuất sắc';
    if (gpa >= 3.2) return 'Giỏi';
    if (gpa >= 2.5) return 'Khá';
    if (gpa >= 2.0) return 'Trung bình';
    return 'Yếu';
  }

  // Chưa biết tên field trong term.entity.ts nên thử các tên hay gặp
  private termLabel(term: unknown): string {
    const t = (term ?? {}) as Record<string, any>;
    return t.termName ?? t.name ?? t.termCode ?? t.code ?? `Học kỳ ${t.id ?? ''}`.trim();
  }

  // 6. Chuyên cần: thống kê theo từng môn
  async getAttendance(studentId: string, termId?: string) {
    const records = await this.attendanceRepo.find({
      where: {
        enrollment: {
          studentId,
          status: EnrollmentStatus.ENROLLED,
          ...(termId ? { section: { termId } } : {}),
        },
      },
      relations: { enrollment: { section: { subject: true } } },
      order: { date: 'ASC' },
    });

    const bySubject = new Map<string, AttendanceSummary>();

    for (const r of records) {
      const subject = r.enrollment.section.subject;
      const item: AttendanceSummary = bySubject.get(subject.id) ?? {
        subjectId: subject.id,
        subject: subject.subjectName,
        total: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        details: [],
      };

      item.total++;
      item[r.status as 'present' | 'late' | 'excused' | 'absent']++;
      if (r.status !== AttendanceStatus.PRESENT) {
        item.details.push({ date: r.date, status: r.status, note: r.note });
      }
      bySubject.set(subject.id, item);
    }

    return [...bySubject.values()].map((s) => ({
      ...s,
      absentRate: s.total ? +((s.absent / s.total) * 100).toFixed(1) : 0,
    }));
  }
}