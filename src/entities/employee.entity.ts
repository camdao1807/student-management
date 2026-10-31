import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AdvisorClasseSection } from './advisor-classe-section.entity';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 30, unique: true })
  employeeCode: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => AdvisorClasseSection, (a) => a.employee)
  advisorSections: AdvisorClasseSection[];
}
