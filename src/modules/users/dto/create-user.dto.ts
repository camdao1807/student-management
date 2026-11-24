import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class CreateUserDto {
  @IsString() @MinLength(3)
  username: string;

  @IsString() @MinLength(6)
  password: string;

  @IsOptional() @IsString()
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional() @IsString()
  refCode?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
