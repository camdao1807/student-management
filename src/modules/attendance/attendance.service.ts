import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { AttendanceSession, SessionStatus } from '../../entities/attendance-session.entity';
import { ClassSection } from '../../entities/class-section.entity';
import { Enrollment, EnrollmentStatus } from '../../entities/enrollment.entity';
import { CreateSessionDto, SaveAttendanceDto } from './attendance.dto';

/** Số buổi tối đa của một lớp học phần (tương ứng 15 buổi trên giao diện) */
export const TOTAL_SESSIONS = 15;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dateStr = (v: unknown) => String(v).slice(0, 10);
/** Đọc field đầu tiên có giá trị (Subject có thể đặt tên field khác nhau) */
const field = (o: unknown, ...keys: string[]): string | null => {
  const r = o as Record<string, unknown> | null | undefined;
  for (const k of keys) {
    const v = r?.[k];
    if (v !== null && v !== undefined && v !== '') return String(v);
  }
  return null;
};
const scheduleOf = (s: ClassSection) => {
  if (!s.dayOfWeek) return null;
  const day = s.dayOfWeek === 8 ? 'Chủ nhật' : `Thứ ${s.dayOfWeek}`;
  return s.startPeriod && s.endPeriod ? `${day}, tiết ${s.startPeriod}-${s.endPeriod}` : day;
};

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attRepo: Repository<Attendance>,
    @InjectRepository(AttendanceSession) private readonly sessionRepo: Repository<AttendanceSession>,
    @InjectRepository(Enrollment) private readonly enrollRepo: Repository<Enrollment>,
    @InjectRepository(ClassSection) private readonly sectionRepo: Repository<ClassSection>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ---------- helpers ----------
  /** Sinh viên đang học lớp học phần (bỏ đăng ký đã hủy và sinh viên đã xóa mềm) */
  private enrollmentsOf(sectionId: string) {
    return this.enrollRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.student', 's')
      .leftJoinAndSelect('s.studentClass', 'c')
      .where('e.sectionId = :sectionId', { sectionId })
      .andWhere('e.status = :st', { st: EnrollmentStatus.ENROLLED })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.studentCode', 'ASC')
      .getMany();
  }

  private attendanceOf(sectionId: string) {
    return this.attRepo
      .createQueryBuilder('a')
      .innerJoin('a.enrollment', 'e')
      .where('e.sectionId = :sectionId', { sectionId })
      .getMany();
  }

  private async findSession(id: string) {
    if (!/^\d+$/.test(id)) throw new BadRequestException('Buổi học này chưa được mở');
    const s = await this.sessionRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy buổi học');
    return s;
  }

  async listStudents(sectionId: string) {
    const [enrolls, rows] = await Promise.all([this.enrollmentsOf(sectionId), this.attendanceOf(sectionId)]);
    const absent = new Map<string, number>();
    rows.forEach((r) => {
      if (r.status === AttendanceStatus.ABSENT) {
        const k = String(r.enrollmentId);
        absent.set(k, (absent.get(k) ?? 0) + 1);
      }
    });
    return enrolls.map((e) => ({
      studentId: String(e.student.id),
      studentCode: e.student.studentCode,
      fullName: e.student.fullName,
      email: e.student.email,
      classCode: e.student.studentClass?.classCode ?? null,
      status: null,
      absentBefore: absent.get(String(e.id)) ?? 0,
    }));
  }
  
  // ---------- Lớp học phần ----------
 async listSections() {
  const sections = await this.sectionRepo.find({
    where: { isActive: true },
    relations: { subject: true, employee: true },
    order: { sectionCode: 'ASC' },
  });

  // Lấy môn chính thức từ bảng courses (trang quản lý môn học dùng bảng này)
  const courseIds = [...new Set(sections.map((c) => c.subject?.courseId).filter((x): x is string => !!x))];
  const courses: { id: string; code: string; name: string; status: string }[] = courseIds.length
    ? await this.ds.query(
        `SELECT id, course_code AS code, name, status FROM courses WHERE id IN (${courseIds.map(() => '?').join(',')})`,
        courseIds,
      )
    : [];
  const courseMap = new Map(courses.map((c) => [String(c.id), c]));

  // Môn đã ánh xạ: theo status của courses. Môn chưa ánh xạ: theo is_active của subjects.
  const visible = sections.filter((c) => {
    const course = c.subject?.courseId ? courseMap.get(String(c.subject.courseId)) : null;
    return course ? course.status === 'active' : c.subject?.isActive !== false;
  });

  const counts = await this.enrollRepo
    .createQueryBuilder('e')
    .select('e.sectionId', 'sectionId')
    .addSelect('COUNT(e.id)', 'cnt')
    .where('e.status = :st', { st: EnrollmentStatus.ENROLLED })
    .groupBy('e.sectionId')
    .getRawMany<{ sectionId: string; cnt: string }>();
  const countMap = new Map(counts.map((r) => [String(r.sectionId), Number(r.cnt)]));

  return visible.map((c) => {
    const course = c.subject?.courseId ? courseMap.get(String(c.subject.courseId)) : null;
    const subjectCode = course?.code ?? field(c.subject, 'subjectCode');
    const subjectName = course?.name ?? field(c.subject, 'subjectName', 'name', 'title');
    return {
      id: String(c.id),
      code: c.sectionCode,
      subjectCode,
      subjectName,
      name: subjectCode && subjectName ? `${subjectCode} - ${subjectName}` : subjectName ?? c.sectionCode,
      lecturerName: c.employee?.fullName ?? null,
      room: c.room,
      schedule: scheduleOf(c),
      studentCount: countMap.get(String(c.id)) ?? 0,
      totalSessions: TOTAL_SESSIONS,
    };
  });
}

  // ---------- Danh sách buổi ----------
  async listSessions(sectionId: string) {
    const [sessions, rows] = await Promise.all([
      this.sessionRepo.find({ where: { sectionId }, order: { number: 'ASC' } }),
      this.attendanceOf(sectionId),
    ]);
    const perDate = new Map<string, { present: number; total: number }>();
    rows.forEach((r) => {
      const k = dateStr(r.date);
      const v = perDate.get(k) ?? { present: 0, total: 0 };
      v.total += 1;
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) v.present += 1;
      perDate.set(k, v);
    });
    const real = sessions.map((s) => {
      const v = perDate.get(dateStr(s.date));
      return {
        id: String(s.id), number: s.number, date: dateStr(s.date), status: s.status,
        presentCount: v?.present ?? 0, total: v?.total ?? 0, lockedBy: s.lockedBy,
      };
    });
    const last = sessions.length ? Math.max(...sessions.map((s) => s.number)) : 0;
    const future = Array.from({ length: Math.max(0, TOTAL_SESSIONS - last) }, (_, i) => ({
      id: `future-${last + i + 1}`, number: last + i + 1, date: null, status: 'future',
      presentCount: 0, total: 0, lockedBy: null,
    }));
    return [...real, ...future];
  }

  async createSession(sectionId: string, dto: CreateSessionDto) {
    const section = await this.sectionRepo.findOne({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Không tìm thấy lớp học phần');
    const list = await this.sessionRepo.find({ where: { sectionId }, order: { number: 'ASC' } });
    if (list.some((s) => s.status === SessionStatus.OPEN)) throw new ConflictException('Đang có một buổi học chưa khóa sổ');
    if (list.length >= TOTAL_SESSIONS) throw new BadRequestException(`Lớp học phần đã đủ ${TOTAL_SESSIONS} buổi`);
    const date = dto.date ?? todayStr();
    if (list.some((s) => dateStr(s.date) === date)) throw new ConflictException('Ngày này đã có buổi học');
    const number = (list.length ? Math.max(...list.map((s) => s.number)) : 0) + 1;
    const saved = await this.sessionRepo.save(this.sessionRepo.create({ sectionId, number, date, status: SessionStatus.OPEN }));
    return { id: String(saved.id), number: saved.number, date: dateStr(saved.date), status: saved.status };
  }

  // ---------- Chi tiết một buổi ----------
  async getSession(id: string) {
    const s = await this.findSession(id);
    const [enrolls, rows] = await Promise.all([this.enrollmentsOf(s.sectionId), this.attendanceOf(s.sectionId)]);
    const byEnroll = new Map<string, Attendance[]>();
    rows.forEach((r) => {
      const k = String(r.enrollmentId);
      byEnroll.set(k, [...(byEnroll.get(k) ?? []), r]);
    });
    const sDate = dateStr(s.date);
    return {
      note: s.note ?? '',
      records: enrolls.map((e) => {
        const mine = byEnroll.get(String(e.id)) ?? [];
        const current = mine.find((r) => dateStr(r.date) === sDate);
        return {
          studentId: String(e.student.id),
          studentCode: e.student.studentCode,
          fullName: e.student.fullName,
          email: e.student.email,
          classCode: e.student.studentClass?.classCode ?? null,
          status: current?.status ?? null,
          // số buổi vắng KHÔNG phép trước buổi này (vắng có phép / đi muộn không tính)
          absentBefore: mine.filter((r) => r.status === AttendanceStatus.ABSENT && dateStr(r.date) < sDate).length,
        };
      }),
    };
  }

  // ---------- Lưu / khóa sổ ----------
  async saveSession(id: string, dto: SaveAttendanceDto, userName: string | null) {
    const s = await this.findSession(id);
    if (s.status === SessionStatus.LOCKED) throw new ConflictException('Buổi học đã khóa sổ, không thể chỉnh sửa');

    const enrolls = await this.enrollmentsOf(s.sectionId);
    const known = new Set(enrolls.map((e) => String(e.student.id)));
    const incoming = new Map<string, AttendanceStatus>();
    for (const r of dto.records) {
      if (!known.has(r.studentId)) throw new BadRequestException(`Sinh viên ${r.studentId} không thuộc lớp học phần này`);
      incoming.set(r.studentId, r.status);
    }
    if (dto.lock && incoming.size !== enrolls.length) {
      throw new BadRequestException(`Còn ${enrolls.length - incoming.size} sinh viên chưa điểm danh`);
    }

    await this.ds.transaction(async (m) => {
      const attRepo = m.getRepository(Attendance);
      const existing = enrolls.length
        ? await attRepo.find({ where: { enrollmentId: In(enrolls.map((e) => e.id)), date: s.date } })
        : [];
      const exMap = new Map(existing.map((a) => [String(a.enrollmentId), a]));
      const toSave: Attendance[] = [];
      const toRemove: Attendance[] = [];
      for (const e of enrolls) {
        const st = incoming.get(String(e.student.id));
        const ex = exMap.get(String(e.id));
        if (!st) { if (ex) toRemove.push(ex); continue; } // bỏ chọn => xóa dòng điểm danh
        if (ex) { ex.status = st; toSave.push(ex); }
        else toSave.push(attRepo.create({ enrollmentId: e.id, date: s.date, status: st }));
      }
      if (toRemove.length) await attRepo.remove(toRemove);
      if (toSave.length) await attRepo.save(toSave);

      s.note = dto.note?.trim() || null;
      if (dto.lock) {
        s.status = SessionStatus.LOCKED;
        s.lockedBy = userName;
        s.lockedAt = new Date();
      }
      await m.getRepository(AttendanceSession).save(s);
    });
    return { ok: true };
  }
}