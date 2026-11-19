import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassSection } from './class-section.entity';
import { Grade } from './grade.entity';
import { Student } from './student.entity';

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  DROPPED = 'dropped', // sinh viên đã hủy đăng ký
}

/** Đăng ký học phần: 1 sinh viên học 1 lớp học phần. Điểm gắn vào đây. */
@Entity('enrollments')
@Index('uq_enrollment_student_section', ['studentId', 'sectionId'], { unique: true })
export class Enrollment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'section_id', type: 'bigint' })
  sectionId: string;

  @ManyToOne(() => ClassSection, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'section_id' })
  section: ClassSection;

  @Column({ type: 'varchar', length: 20, default: EnrollmentStatus.ENROLLED })
  status: EnrollmentStatus;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;

  @OneToOne(() => Grade, (g) => g.enrollment)
  grade?: Grade;
}