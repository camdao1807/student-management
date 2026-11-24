import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';

export class UpdateUserDto {
  @IsOptional() @IsString()
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional() @IsString()
  refCode?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
