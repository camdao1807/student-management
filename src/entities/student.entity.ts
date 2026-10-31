import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentClass } from './student-class.entity';
import { StudentStatus } from './student-status.entity';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'student_code', type: 'varchar', length: 20, unique: true })
  studentCode: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Index('idx_students_class_id')
  @Column({ name: 'class_id', type: 'bigint' })
  classId: string;

  @ManyToOne(() => StudentClass, (c) => c.students, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'class_id' })
  studentClass: StudentClass;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => StudentStatus, (s) => s.student)
  statuses: StudentStatus[];
}
