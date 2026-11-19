import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CATEGORIES } from './create-course.dto';

export class QueryCourseDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsIn(CATEGORIES as unknown as string[]) category?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() credits?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
