import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';
import { RegisterCourseDto } from './dto/register-course.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('student-portal/:studentId')
export class StudentPortalController {
  constructor(private readonly service: StudentPortalService) {}

  // 1. Hồ sơ cá nhân
  @Get('profile')
  profile(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getProfile(String(studentId));
  }

  // 1b. Sinh viên tự chỉnh sửa thông tin cá nhân
  @Patch('profile')
  updateProfile(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.updateProfile(String(studentId), dto);
  }

  // 2. Đăng ký học phần
  @Get('sections/open')
  openSections(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.service.getOpenSections(String(studentId), String(termId));
  }

  @Post('enrollments')
  register(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: RegisterCourseDto,
  ) {
    return this.service.register(String(studentId), String(dto.classSectionId));
  }

  @Delete('enrollments/:enrollmentId')
  cancel(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
  ) {
    return this.service.cancel(String(studentId), String(enrollmentId));
  }

  // 3. Thời khóa biểu
  @Get('timetable')
  timetable(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('termId', ParseIntPipe) termId: number,
  ) {
    return this.service.getTimetable(String(studentId), String(termId));
  }

  // 4. Điểm theo môn (termId không bắt buộc)
  @Get('grades')
  grades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('termId') termId?: string,
  ) {
    return this.service.getGrades(String(studentId), termId || undefined);
  }

  // 5. Bảng điểm / GPA
  @Get('transcript')
  transcript(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getTranscript(String(studentId));
  }

  // 6. Chuyên cần (termId không bắt buộc)
  @Get('attendance')
  attendance(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('termId') termId?: string,
  ) {
    return this.service.getAttendance(String(studentId), termId || undefined);
  }
}