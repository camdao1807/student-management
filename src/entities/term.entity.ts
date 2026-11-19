import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Học kỳ, ví dụ "2026-1" (học kỳ 1 năm học 2026-2027) */
@Entity('terms')
export class Term {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'term_code', type: 'varchar', length: 20, unique: true })
  termCode: string;

  @Column({ name: 'term_name', type: 'varchar', length: 100 })
  termName: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  /** Học kỳ hiện tại (nên chỉ có 1 học kỳ true, kiểm tra trong service) */
  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  /** Đang mở cho sinh viên đăng ký học phần */
  @Column({ name: 'registration_open', type: 'boolean', default: false })
  registrationOpen: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}