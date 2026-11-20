import {
  Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Subject } from './subject.entity';
import { Term } from './term.entity';

/** Lớp học phần = môn học + học kỳ + giảng viên + lịch học */
@Entity('class_sections')
export class ClassSection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** Mã lớp học phần, ví dụ "INT101-01" */
  @Column({ name: 'section_code', type: 'varchar', length: 30, unique: true })
  sectionCode: string;

  @Column({ name: 'subject_id', type: 'bigint' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'term_id', type: 'bigint' })
  termId: string;

  @ManyToOne(() => Term, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'term_id' })
  term: Term;

  /**
   * Giảng viên phụ trách = id trong bảng `employees` (giống advisor_classe_sections).
   * Mới khai báo cột; khi có entity Employee thì thêm @ManyToOne + @JoinColumn({ name: 'employee_id' }).
   */
  @Column({ name: 'employee_id', type: 'bigint', nullable: true })
  employeeId: string | null;

  @Column({ name: 'max_students', type: 'smallint', unsigned: true, default: 60 })
  maxStudents: number;

  /** Thứ trong tuần: 2 (Thứ 2) đến 8 (Chủ nhật), dùng để kiểm tra trùng lịch */
  @Column({ name: 'day_of_week', type: 'tinyint', unsigned: true, nullable: true })
  dayOfWeek: number | null;

  /** Tiết bắt đầu và kết thúc (1 đến 12) */
  @Column({ name: 'start_period', type: 'tinyint', unsigned: true, nullable: true })
  startPeriod: number | null;

  @Column({ name: 'end_period', type: 'tinyint', unsigned: true, nullable: true })
  endPeriod: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  room: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}