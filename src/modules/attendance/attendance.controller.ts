import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { CreateSessionDto, SaveAttendanceDto } from './attendance.dto';
import { AttendanceService } from './attendance.service';

/** Ở đây "section" = lớp học phần (class_sections) */
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('sections')
  sections() {
    return this.service.listSections();
  }

  @Get('sections/:sectionId/sessions')
  sessions(@Param('sectionId') sectionId: string) {
    return this.service.listSessions(sectionId);
  }

    @Get('sections/:sectionId/students')
  students(@Param('sectionId') sectionId: string) {
    return this.service.listStudents(sectionId);
  }

  @Post('sections/:sectionId/sessions')
  createSession(@Param('sectionId') sectionId: string, @Body() dto: CreateSessionDto) {
    return this.service.createSession(sectionId, dto);
  }

  @Get('sessions/:id')
  session(@Param('id') id: string) {
    return this.service.getSession(id);
  }

  @Put('sessions/:id')
  save(@Param('id') id: string, @Body() dto: SaveAttendanceDto, @Req() req: any) {
    // ⚠ Đổi theo cách lấy người dùng đăng nhập của dự án (guard / JWT)
    const user = req.user;
    return this.service.saveSession(id, dto, user?.fullName ?? user?.username ?? user?.email ?? null);
  }
}