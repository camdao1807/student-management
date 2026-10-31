import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Employee } from './employee.entity';
import { StudentClass } from './student-class.entity';

@Entity({ name: 'advisor_classe_sections' })
@Index('idx_advisor_class_dates', ['studentClassId', 'startDate', 'endDate'])
export class AdvisorClasseSection {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index('idx_advisor_employee')
  @Column({ name: 'employee_id', type: 'bigint' })
  employeeId: string;

  @ManyToOne(() => Employee, (e) => e.advisorSections, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'student_class_id', type: 'bigint' })
  studentClassId: string;

  @ManyToOne(() => StudentClass, (c) => c.advisorSections, {
    nullable: false,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'student_class_id' })
  studentClass: StudentClass;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
