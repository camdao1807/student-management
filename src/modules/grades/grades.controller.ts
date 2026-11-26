import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { GradesService } from './grades.service';
import { QueryGradeDto } from './dto/query-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { EnrollGradeDto } from './dto/enroll-grade.dto';
import { LockGradeDto } from './dto/lock-grade.dto';

@Controller('grades')
export class GradesController {
  constructor(private readonly service: GradesService) {}

  // Các route cố định đặt TRƯỚC ':id'
  @Get('options') options() { return this.service.options(); }
  @Get('sheet') sheet(@Query() q: QueryGradeDto) { return this.service.sheet(q); }
  @Get('summary') summary(@Query() q: QueryGradeDto) { return this.service.summary(q); }
  @Get('trend') trend(@Query('courseId') courseId?: string) { return this.service.trend(courseId ? Number(courseId) : undefined); }
  @Post('enroll') enroll(@Body() dto: EnrollGradeDto) { return this.service.enroll(dto); }
  @Post('lock') lock(@Body() dto: LockGradeDto) { return this.service.lock(dto); }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGradeDto) {
    return this.service.update(id, dto);
  }
}