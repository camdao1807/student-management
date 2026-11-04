import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdvisorsService } from './advisors.service';
import { CreateAdvisorDto } from './dto/create-advisor.dto';
import { EndAdvisorDto, UpdateAdvisorDto } from './dto/update-advisor.dto';
import { QueryAdvisorDto } from './dto/query-advisor.dto';

// Không có DELETE: phân công chỉ được kết thúc, không xóa → giữ nguyên lịch sử.
@Controller('advisor-assignments')
export class AdvisorsController {
  constructor(private readonly service: AdvisorsService) {}

  @Get() findAll(@Query() query: QueryAdvisorDto) { return this.service.findAll(query); }

  // Các route cố định phải đặt TRƯỚC route ':id'
  @Get('stats') stats() { return this.service.stats(); }
  @Get('options') options() { return this.service.options(); }
  @Get('class/:classId/history')
  history(@Param('classId', ParseIntPipe) classId: number) { return this.service.historyByClass(classId); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateAdvisorDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdvisorDto) {
    return this.service.update(id, dto);
  }
  @Patch(':id/end') end(@Param('id', ParseIntPipe) id: number, @Body() dto: EndAdvisorDto) {
    return this.service.end(id, dto);
  }
}