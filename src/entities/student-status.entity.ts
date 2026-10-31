import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { User } from './user.entity';

export enum StudentStatusValue {
  STUDYING = 'studying',
  RESERVED = 'reserved',
  DROPPED = 'dropped',
  GRADUATED = 'graduated',
}

@Entity({ name: 'student_status' })
@Index('idx_status_student_date', ['studentId', 'effectiveDate', 'id'])
export class StudentStatus {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'student_id', type: 'bigint' })
  studentId: string;

  @ManyToOne(() => Student, (s) => s.statuses, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ type: 'varchar', length: 30 })
  status: StudentStatusValue;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
