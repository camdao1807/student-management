import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAdvisorDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() classId?: number;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
  @IsOptional() @IsIn(['active', 'ended', 'upcoming']) status?: 'active' | 'ended' | 'upcoming';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}