import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { StudentClassesService } from './student-classes.service';
import { CreateStudentClassDto } from './dto/create-student-class.dto';
import { UpdateStudentClassDto } from './dto/update-student-class.dto';
import { AssignStudentsDto } from './dto/assign-students.dto';

@Controller('student-classes')
export class StudentClassesController {
  constructor(private readonly service: StudentClassesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStudentClassDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentClassDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/students')
  students(@Param('id') id: string) {
    return this.service.getStudents(id);
  }

  @Get(':id/available-students')
  availableStudents(@Param('id') id: string) {
    return this.service.getAvailableStudents(id);
  }

  @Post(':id/students')
  assign(@Param('id') id: string, @Body() dto: AssignStudentsDto) {
    return this.service.assignStudents(id, dto.studentIds);
  }
}