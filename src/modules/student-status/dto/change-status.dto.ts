import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { STATUSES } from '../student-status.constants';

export class ChangeStatusDto {
  @IsIn(STATUSES as unknown as string[], { message: 'Trạng thái không hợp lệ' })
  status: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày hiệu lực phải có dạng YYYY-MM-DD' })
  effectiveDate: string;

  @IsOptional() @IsString() @MaxLength(1000)
  reason?: string;
}