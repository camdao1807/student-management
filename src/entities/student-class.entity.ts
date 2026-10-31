import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from './student.entity';
import { AdvisorClasseSection } from './advisor-classe-section.entity';

@Entity({ name: 'student_classes' })
export class StudentClass {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'class_code', type: 'varchar', length: 30, unique: true })
  classCode: string;

  @Column({ name: 'class_name', type: 'varchar', length: 150 })
  className: string;

  @Column({ name: 'major_name', type: 'varchar', length: 150 })
  majorName: string;

  @Column({ name: 'academic_year', type: 'varchar', length: 20 })
  academicYear: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @OneToMany(() => Student, (s) => s.studentClass)
  students: Student[];

  @OneToMany(() => AdvisorClasseSection, (a) => a.studentClass)
  advisorSections: AdvisorClasseSection[];
}
