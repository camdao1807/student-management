import { IsInt, IsOptional, Matches, IsString } from 'class-validator';
import { Type } from 'class-transformer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAdvisorDto {
  @Type(() => Number)
  @IsInt({ message: 'Giảng viên không hợp lệ' })
  employeeId: number;

  @Type(() => Number)
  @IsInt({ message: 'Lớp không hợp lệ' })
  studentClassId: number;

  @IsString()
  @Matches(DATE_RE, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD' })
  startDate: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  endDate?: string | null;
}