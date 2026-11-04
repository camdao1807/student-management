import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { StudentStatusService } from './student-status.service';
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

  @Get('students/:id/history')
  history(@Param('id', ParseIntPipe) id: number) { return this.service.history(id); }

  @Post('students/:id/change')
  change(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeStatusDto, @Req() req: any) {
    return this.service.change(id, dto, this.uid(req));
  }
}