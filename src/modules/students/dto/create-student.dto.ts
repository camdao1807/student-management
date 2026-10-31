import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsNotFutureDate } from '../validators/is-not-future-date';

export const GENDERS = ['male', 'female', 'other'] as const;

export class CreateStudentDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  studentCode: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày sinh phải có dạng YYYY-MM-DD',
  })
  @IsNotFutureDate()
  dateOfBirth: string;

  @IsOptional()
  @IsIn(GENDERS, { message: `Giới tính phải là: ${GENDERS.join(', ')}` })
  gender?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(150)
  email: string;

  @IsOptional()
  @Matches(/^[0-9+\-\s()]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'classId phải là số' })
  classId: string;
}
