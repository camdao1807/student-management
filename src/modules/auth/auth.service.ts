import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsernameWithPassword(username);
    // Cùng một thông báo để không lộ tài khoản có tồn tại hay không
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khóa');

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      refCode: user.refCode,
    });
    const { passwordHash, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  me(id: string) {
    return this.users.findOne(id);
  }

  /** Luôn trả cùng một thông báo để không lộ tài khoản có tồn tại hay không */
  async forgotPassword(identifier: string) {
    const generic = { message: 'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.' };
    const user = await this.users.findByUsernameOrEmail(identifier.trim());
    if (!user || !user.isActive) return generic;

    const token = randomBytes(32).toString('hex');
    await this.users.saveResetToken(user, token, 15);
    const base = process.env.APP_URL || 'http://localhost:3000';
    await this.mail.sendResetLink(user.email, `${base}/reset-password.html?token=${token}`);
    return generic;
  }

  resetPassword(token: string, newPassword: string) {
    return this.users.resetByToken(token, newPassword);
  }
}
