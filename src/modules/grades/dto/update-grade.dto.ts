import { IsNumber, IsOptional, Max, Min } from 'class-validator';

const OPT = { maxDecimalPlaces: 2 };
const MSG = { message: 'Điểm phải từ 0 đến 10' };

/** Mỗi trường là điểm hệ 10; gửi null để xóa điểm. */
export class UpdateGradeDto {
  @IsOptional() @IsNumber(OPT) @Min(0, MSG) @Max(10, MSG) attendance?: number | null;
  @IsOptional() @IsNumber(OPT) @Min(0, MSG) @Max(10, MSG) assignment?: number | null;
  @IsOptional() @IsNumber(OPT) @Min(0, MSG) @Max(10, MSG) midterm?: number | null;
  @IsOptional() @IsNumber(OPT) @Min(0, MSG) @Max(10, MSG) finalExam?: number | null;
}
