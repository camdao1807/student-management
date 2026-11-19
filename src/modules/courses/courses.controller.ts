import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { PrerequisiteDto } from './dto/prerequisite.dto';

// Không có DELETE môn học: ngưng giảng dạy bằng PATCH status = 'inactive' để giữ lịch sử điểm.
@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get() findAll(@Query() q: QueryCourseDto) { return this.service.findAll(q); }

  // Các route cố định đặt TRƯỚC ':id'
  @Get('stats') stats() { return this.service.stats(); }
  @Get('options') options() { return this.service.options(); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateCourseDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) { return this.service.update(id, dto); }

  @Post(':id/prerequisites')
  addPre(@Param('id', ParseIntPipe) id: number, @Body() dto: PrerequisiteDto) { return this.service.addPrerequisite(id, dto); }

  @Delete(':id/prerequisites/:preId')
  removePre(@Param('id', ParseIntPipe) id: number, @Param('preId', ParseIntPipe) preId: number) {
    return this.service.removePrerequisite(id, preId);
  }
}
