import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TERMS } from '../grades.constants';

export class QueryGradeDto {
  @Type(() => Number) @IsInt({ message: 'Vui lòng chọn môn học' }) courseId: number;
  @IsIn(TERMS, { message: 'Học kỳ không hợp lệ' }) term: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['A', 'B', 'C', 'D', 'F', 'none']) grade?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
