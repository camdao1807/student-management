import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { StudentStatusValue } from '../../../entities/student-status.entity';
import { GENDERS } from './create-student.dto';

export class QueryStudentDto {
  /** Tìm theo mã sinh viên hoặc họ tên */
  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @Matches(/^\d+$/)
  classId?: string;

  @IsOptional() @IsIn(GENDERS)
  gender?: string;

  @IsOptional() @IsIn(Object.values(StudentStatusValue))
  status?: StudentStatusValue;

  /** Lọc theo khóa / năm học của lớp, ví dụ 2024-2028 */
  @IsOptional() @IsString()
  academicYear?: string;

  /** true = chỉ xem hồ sơ đã lưu trữ */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  archived?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}