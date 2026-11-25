import { Body, Controller, Get, Header, Param, ParseIntPipe, Post, Query, Req, StreamableFile } from '@nestjs/common';
import { StudentStatusService } from './student-status.service';
import { BulkChangeStatusDto } from './dto/bulk-change-status.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { QueryStatusDto } from './dto/query-status.dto';

@Controller('student-status')
export class StudentStatusController {
  constructor(private readonly service: StudentStatusService) {}

  // Khi có module auth, req.user.id sẽ được điền; hiện tại để null
  private uid(req: any): number | null { return req?.user?.id ?? null; }

  @Get() findAll(@Query() q: QueryStatusDto) { return this.service.findAll(q); }

  // Route cố định đặt TRƯỚC route có tham số
  @Get('stats') stats() { return this.service.stats(); }
  @Get('meta') meta() { return this.service.meta(); }
  @Get('classes') classes() { return this.service.classes(); }

  @Get('export')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="trang-thai-hoc-vu.xlsx"')
  async export(@Query() q: QueryStatusDto) {
    const data = await this.service.exportExcel(q);
    return new StreamableFile(Buffer.from(data as ArrayBuffer));
  }

  @Post('bulk-change')
  bulkChange(@Body() dto: BulkChangeStatusDto, @Req() req: any) {
    return this.service.bulkChange(dto, this.uid(req));
  }

  @Get('students/:id/history')
  history(@Param('id', ParseIntPipe) id: number) { return this.service.history(id); }

  @Post('students/:id/change')
  change(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto, @Req() req: any) {
    return this.service.change(id, dto, this.uid(req));
  }
}