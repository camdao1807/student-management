import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { SubstitutesService } from './substitutes.service';

@Controller('substitute-teachings')
export class SubstitutesController {
  constructor(private readonly s: SubstitutesService) {}

  // Route cố định đặt TRƯỚC ':id'
  @Get('options') options() { return this.s.options(); }
  @Get('stats') stats(@Query() q: any) { return this.s.stats(q); }
  @Get('workdays') workdays(@Query() q: any) { return this.s.workdays(q); }
  @Get('changes') changes(@Query() q: any) { return this.s.changes(q); }
  @Get() list(@Query() q: any) { return this.s.list(q); }
  @Post() create(@Body() b: any) { return this.s.create(b); }
  @Patch(':id/complete') complete(@Param('id', ParseIntPipe) id: number) { return this.s.complete(id); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.s.remove(id); }
}