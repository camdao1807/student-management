import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, ResetWithTokenDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type JwtPayload } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Public()
  @HttpCode(200)
  @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  reset(@Body() dto: ResetWithTokenDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  me(@CurrentUser() u: JwtPayload) {
    return this.auth.me(u.sub);
  }

  @Post('change-password')
  changePassword(@CurrentUser() u: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.users.changeOwnPassword(u.sub, dto.oldPassword, dto.newPassword);
  }
}
