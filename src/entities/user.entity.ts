import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
  ADVISOR = 'advisor',
  STUDENT = 'student',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({ type: 'varchar', length: 30, default: UserRole.STAFF })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  // ====== CÁC CỘT THÊM MỚI ======

  @Column({ name: 'full_name', type: 'varchar', length: 150, nullable: true })
  fullName: string | null;

  /** Cần để gửi liên kết "quên mật khẩu" */
  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  /** Mã sinh viên / mã nhân viên / mã cố vấn mà tài khoản gắn vào */
  @Column({ name: 'ref_code', type: 'varchar', length: 50, nullable: true })
  refCode: string | null;

  @Column({
    name: 'reset_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  resetTokenHash: string | null;

  @Column({
    name: 'reset_token_expires',
    type: 'datetime',
    nullable: true,
    select: false,
  })
  resetTokenExpires: Date | null;
}
