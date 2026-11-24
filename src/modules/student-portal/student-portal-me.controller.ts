import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { StudentPortalService } from './student-portal.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('student-portal/me')
export class StudentPortalMeController {
  constructor(
    private readonly service: StudentPortalService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  me(@CurrentUser() user: any) {
    return this.service.getIdByCode(user.refCode ?? user.username);
  }

  // Sinh viên tự đổi mật khẩu của chính mình
  @Post('change-password')
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    const username = user.username ?? user.refCode;
    const rows = await this.dataSource.query(
      'SELECT id, password_hash FROM users WHERE username = ? AND is_active = 1 LIMIT 1',
      [username],
    );
    if (!rows.length) throw new BadRequestException('Không tìm thấy tài khoản');

    const ok = await bcrypt.compare(dto.currentPassword, rows[0].password_hash);
    if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.dataSource.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].id]);
    return { message: 'Đổi mật khẩu thành công' };
  }
}