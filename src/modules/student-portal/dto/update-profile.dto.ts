import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsNotFutureDate } from '../../students/validators/is-not-future-date';

const GENDERS = ['male', 'female', 'other'];

// Sinh viên chỉ được tự sửa các trường này.
// Họ tên, mã sinh viên, lớp, ngành, trạng thái do nhà trường quản lý.
export class UpdateProfileDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày sinh phải có dạng YYYY-MM-DD' })
  @IsNotFutureDate()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(GENDERS, { message: 'Giới tính phải là: male, female, other' })
  gender?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255, { message: 'Quê quán tối đa 255 ký tự' })
  hometown?: string;
}