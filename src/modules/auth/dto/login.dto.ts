import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString() username: string;
  @IsString() password: string;
}

export class ChangePasswordDto {
  @IsString() oldPassword: string;
  @IsString() @MinLength(6) newPassword: string;
}

export class ForgotPasswordDto {
  /** Tên đăng nhập hoặc email */
  @IsString() identifier: string;
}

export class ResetWithTokenDto {
  @IsString() token: string;
  @IsString() @MinLength(6) newPassword: string;
}
