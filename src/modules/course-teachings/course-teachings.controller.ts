import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { CourseTeachingsService } from './course-teachings.service';

@Controller('course-teachings')
export class CourseTeachingsController {
  constructor(private readonly s: CourseTeachingsService) {}

  @Get('options') options() { return this.s.options(); }
  @Get() list() { return this.s.list(); }
  @Patch(':courseId') update(@Param('courseId', ParseIntPipe) courseId: number, @Body() b: any) { return this.s.update(courseId, b); }
}
