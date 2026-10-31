import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { CheckCodeDto } from './dto/check-code.dto';
import { ChangeStatusDto } from './dto/change-status.dto';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  // Khi có module auth, req.user.id sẽ có giá trị; hiện tại là null
  private uid(req: any): string | null {
    return req?.user?.id ?? null;
  }

  @Post()
  create(@Body() dto: CreateStudentDto, @Req() req: any) {
    return this.service.create(dto, this.uid(req));
  }

  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.service.findAll(query);
  }

  // Phải đặt TRƯỚC ':id'
  @Get('check-code')
  async checkCode(@Query() q: CheckCodeDto) {
    return {
      code: q.code,
      available: await this.service.isCodeAvailable(q.code, q.excludeId),
    };
  }
  @Get('classes-options')
  classOptions() {
    return this.service.listClassOptions();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @Req() req: any,
  ) {
    return this.service.changeStatus(id, dto, this.uid(req));
  }

  @Get(':id/status-history')
  statusHistory(@Param('id') id: string) {
    return this.service.statusHistory(id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }
}
