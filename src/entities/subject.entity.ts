import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Môn học (danh mục môn, chưa gắn học kỳ hay giảng viên) */
@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'subject_code', type: 'varchar', length: 20, unique: true })
  subjectCode: string;

  @Column({ name: 'subject_name', type: 'varchar', length: 150 })
  subjectName: string;

  /** Số tín chỉ (1 đến 10) */
  @Column({ type: 'tinyint', unsigned: true })
  credits: number;

  /** Ngành phụ trách, khớp với majorName của lớp hành chính */
  @Column({ name: 'major_name', type: 'varchar', length: 150, nullable: true })
  majorName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}