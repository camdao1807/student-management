import { IsIn, IsOptional } from 'class-validator';
import { DashboardReportQueryDto } from './dashboard-report-query.dto';

export class DashboardExportQueryDto extends DashboardReportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx' = 'xlsx';
}