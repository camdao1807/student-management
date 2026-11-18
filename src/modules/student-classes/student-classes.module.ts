import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentClass } from '../../entities/student-class.entity';
import { Student } from '../../entities/student.entity';
import { AdvisorClasseSection } from '../../entities/advisor-classe-section.entity';
import { StudentClassesController } from './student-classes.controller';
import { StudentClassesService } from './student-classes.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentClass, Student, AdvisorClasseSection])],
  controllers: [StudentClassesController],
  providers: [StudentClassesService],
})
export class StudentClassesModule {}