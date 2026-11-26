import {
  Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Enrollment } from './enrollment.entity';

/** TypeORM trả DECIMAL của MySQL dạng chuỗi, chuyển về number cho dễ tính */
const decimal = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? null : Number(v)),
};

/** Điểm của một đăng ký học phần (hệ 10). Giảng viên nhập 3 điểm thành phần, service tính phần còn lại. */
@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'enrollment_id', type: 'bigint', unique: true })
  enrollmentId: string;

  @OneToOne(() => Enrollment, (e) => e.grade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  /** Điểm chuyên cần (gợi ý trọng số 10%) */
  @Column({ name: 'attendance_score', type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: decimal })
  attendanceScore: number | null;

  /** Điểm bài tập / lab */
  @Column({ name: 'assignment_score', type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: decimal })
  assignmentScore: number | null;

  /** Điểm giữa kỳ (gợi ý 30%) */
  @Column({ name: 'midterm_score', type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: decimal })
  midtermScore: number | null;

  /** Điểm cuối kỳ (gợi ý 60%) */
  @Column({ name: 'final_score', type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: decimal })
  finalScore: number | null;

  /** Điểm tổng kết hệ 10, tính trong service khi đủ 3 điểm thành phần */
  @Column({ name: 'total_score', type: 'decimal', precision: 4, scale: 2, nullable: true, transformer: decimal })
  totalScore: number | null;

  /** Điểm chữ: A, B+, B, C+, C, D+, D, F */
  @Column({ name: 'letter_grade', type: 'varchar', length: 2, nullable: true })
  letterGrade: string | null;

  /** Đạt hay không đạt môn (null khi chưa đủ điểm) */
  @Column({ name: 'is_passed', type: 'boolean', nullable: true })
  isPassed: boolean | null;

  /** Điểm đã khóa, giảng viên không sửa được nữa, chỉ admin mở khóa */
  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  /** id người nhập hoặc sửa gần nhất (null khi chưa có module đăng nhập) */
  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}