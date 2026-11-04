import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const STATUS_FILTERS = [
  'studying',
  'reserved',
  'dropped',
  'graduated',
  'no_status',
] as const;

const ARCHIVE_SCOPES = ['active', 'archived', 'all'] as const;

const SORT_FIELDS = [
  'studentCode',
  'fullName',
  'classCode',
  'academicYear',
  'gender',
  'email',
  'status',
  'admissionDate',
] as const;

export class DashboardReportQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  @IsOptional()
  @IsIn(STATUS_FILTERS)
  status?: (typeof STATUS_FILTERS)[number];

  @IsOptional()
  @IsIn(ARCHIVE_SCOPES)
  archiveScope: (typeof ARCHIVE_SCOPES)[number] = 'active';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy: (typeof SORT_FIELDS)[number] = 'studentCode';

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'ASC';
}