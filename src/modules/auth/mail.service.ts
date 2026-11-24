import { Injectable, Logger } from '@nestjs/common';

/**
 * Gửi email đặt lại mật khẩu.
 * - Có cấu hình SMTP_HOST (và `npm i nodemailer`) -> gửi mail thật.
 * - Chưa cấu hình -> in liên kết ra console (tiện khi phát triển).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendResetLink(to: string | null | undefined, link: string) {
    if (!process.env.SMTP_HOST || !to) {
      this.logger.warn(`[DEV] Liên kết đặt lại mật khẩu${to ? ` cho ${to}` : ''}: ${link}`);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: 'Đặt lại mật khẩu - SM University',
      html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
             <p><a href="${link}">Bấm vào đây để đặt mật khẩu mới</a> (liên kết hết hạn sau 15 phút).</p>
             <p>Nếu không phải bạn, hãy bỏ qua email này.</p>`,
    });
  }
}
