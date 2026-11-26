import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum SessionStatus {
  OPEN = 'open',
  LOCKED = 'locked',
}

/**
 * Buổi học của một lớp học phần (class_sections).
 * Bảng `attendances` lưu điểm danh theo (đăng ký học phần, ngày); bảng này lưu thông tin chung của buổi:
 * số thứ tự, trạng thái khóa sổ, ghi chú giảng viên. Liên kết với `attendances` qua cặp (sectionId, date).
 */
@Entity({ name: 'attendance_sessions' })
@Index('uq_att_session_section_number', ['sectionId', 'number'], { unique: true })
@Index('uq_att_session_section_date', ['sectionId', 'date'], { unique: true })
export class AttendanceSession {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'section_id', type: 'bigint' })
  sectionId: string;

  /** Số thứ tự buổi: 1, 2, 3... */
  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ name: 'locked_by', type: 'varchar', length: 150, nullable: true })
  lockedBy: string | null;

  @Column({ name: 'locked_at', type: 'datetime', nullable: true })
  lockedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}