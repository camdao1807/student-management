import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateNested,
} from 'class-validator';

export class ProvisionItemDto {
  /** Mã SV / mã nhân viên / mã cố vấn — dùng làm tên đăng nhập */
  @IsString() @MinLength(3)
  code: string;

  @IsOptional() @IsString()
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;
}

export class ProvisionUsersDto {
  @IsIn(['student', 'advisor', 'staff'])
  role: 'student' | 'advisor' | 'staff';

  @IsString() @MinLength(6)
  defaultPassword: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProvisionItemDto)
  items: ProvisionItemDto[];
}
