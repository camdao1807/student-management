import {
  BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException,
  Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
// Sửa đường dẫn cho đúng với project (giống student-portal-me.controller.ts)
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const ROLES = ['admin', 'staff', 'advisor', 'student'];
// Mật khẩu mặc định khi tạo / đặt lại, theo vai trò
const DEFAULT_PASSWORD: Record<string, string> = {
  student: 'Student@123',
  advisor: 'Lecturer@123',
  staff: 'Staff@123',
  admin: 'Admin@123',
};

@Controller('accounts')
export class AccountsController {
  constructor(private readonly ds: DataSource) {}

  // Chặn mọi tài khoản không phải admin, kể cả khi guard role của project cấu hình khác
  private assertAdmin(user: any) {
    if (!user || user.role !== 'admin') throw new ForbiddenException('Chỉ quản trị viên được thực hiện');
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    this.assertAdmin(user);
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const where: string[] = [];
    const params: any[] = [];
    if (q && q.trim()) {
      where.push('(username LIKE ? OR full_name LIKE ? OR email LIKE ?)');
      const like = `%${q.trim()}%`;
      params.push(like, like, like);
    }
    if (role && ROLES.includes(role)) { where.push('role = ?'); params.push(role); }
    if (status === 'active') where.push('is_active = 1');
    if (status === 'locked') where.push('is_active = 0');
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [{ c }] = await this.ds.query(`SELECT COUNT(*) AS c FROM users ${w}`, params);
    const rows = await this.ds.query(
      `SELECT id, username, full_name AS fullName, email, role, is_active AS isActive,
              ref_code AS refCode, created_at AS createdAt
       FROM users ${w} ORDER BY role, username LIMIT ? OFFSET ?`,
      [...params, l, (p - 1) * l],
    );
    const total = Number(c);
    return {
      data: rows.map((r: any) => ({ ...r, isActive: !!r.isActive })),
      meta: { total, page: p, limit: l, totalPages: Math.max(1, Math.ceil(total / l)) },
    };
  }

  // Khóa / mở khóa tài khoản
  @Patch(':id/active')
  async setActive(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    this.assertAdmin(user);
    const [target] = await this.ds.query('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!isActive && target.username === user.username) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của mình');
    }
    await this.ds.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    return { message: isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' };
  }

  // Đặt lại mật khẩu về mặc định theo vai trò
  @Post(':id/reset-password')
  async resetPassword(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    this.assertAdmin(user);
    const [target] = await this.ds.query('SELECT id, username, role FROM users WHERE id = ?', [id]);
    if (!target) throw new NotFoundException('Không tìm thấy tài khoản');
    const newPassword = DEFAULT_PASSWORD[target.role] ?? 'Password@123';
    const hash = await bcrypt.hash(newPassword, 10);
    await this.ds.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    return { username: target.username, newPassword };
  }

  // Tạo tài khoản còn thiếu cho toàn bộ sinh viên và giảng viên (đã có thì bỏ qua)
  @Post('provision')
  async provision(@CurrentUser() user: any) {
    this.assertAdmin(user);
    const hs = await bcrypt.hash(DEFAULT_PASSWORD.student, 10);
    const ha = await bcrypt.hash(DEFAULT_PASSWORD.advisor, 10);

    const s = await this.ds.query(
      `INSERT INTO users (username, password_hash, role, is_active, full_name, email, ref_code)
       SELECT s.student_code, ?, 'student', 1, s.full_name, s.email, s.student_code
       FROM students s
       WHERE s.deleted_at IS NULL AND s.student_code NOT IN (SELECT username FROM users)`,
      [hs],
    );
    const a = await this.ds.query(
      `INSERT INTO users (username, password_hash, role, is_active, full_name, email, ref_code)
       SELECT e.employee_code, ?, 'advisor', 1, e.full_name, e.email, e.employee_code
       FROM employees e
       WHERE e.is_active = 1 AND e.employee_code NOT IN (SELECT username FROM users)`,
      [ha],
    );
    return { students: s.affectedRows ?? 0, advisors: a.affectedRows ?? 0 };
  }
}