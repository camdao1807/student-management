import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from './enrollment.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused', // vắng có phép
}

/** Điểm danh: mỗi đăng ký học phần có tối đa 1 dòng cho mỗi ngày học */
@Entity('attendances')
@Index('uq_attendance_enrollment_date', ['enrollmentId', 'date'], { unique: true })
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'enrollment_id', type: 'bigint' })
  enrollmentId: string;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;
}