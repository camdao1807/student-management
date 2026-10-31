import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DashboardExportQueryDto } from './dto/dashboard-export-query.dto';
import { DashboardReportQueryDto } from './dto/dashboard-report-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('report/options')
  getReportOptions() {
    return this.dashboardService.getReportOptions();
  }

  @Get('report/students')
  getStudentReport(@Query() query: DashboardReportQueryDto) {
    return this.dashboardService.getStudentReport(query);
  }

  @Get('report/students/export')
  async exportStudentReport(
    @Query() query: DashboardExportQueryDto,
    @Res() response: Response,
  ) {
    const file = await this.dashboardService.exportStudentReport(query);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.send(file.data);
  }
}