import { IsOptional, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Chỉ cho sửa mốc thời gian; đổi GV/lớp = tạo phân công mới để không ghi đè lịch sử. */
export class UpdateAdvisorDto {
  @IsOptional()
  @Matches(DATE_RE, { message: 'Ngày bắt đầu phải có dạng YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  endDate?: string | null;
}

export class EndAdvisorDto {
  @IsOptional()
  @Matches(DATE_RE, { message: 'Ngày kết thúc phải có dạng YYYY-MM-DD' })
  endDate?: string;
}