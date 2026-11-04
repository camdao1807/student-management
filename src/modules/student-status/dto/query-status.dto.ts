import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { STATUSES } from '../student-status.constants';

export class QueryStatusDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(STATUSES as unknown as string[]) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() classId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}