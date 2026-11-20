import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../../entities/student.entity';
import { StudentStatus } from '../../entities/student-status.entity';
import { ClassSection } from '../../entities/class-section.entity';
import { Enrollment } from '../../entities/enrollment.entity';
import { Grade } from '../../entities/grade.entity';
import { Attendance } from '../../entities/attendance.entity';
import { StudentPortalController } from './student-portal.controller';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, StudentStatus, ClassSection, Enrollment, Grade, Attendance]),
  ],
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
})
export class StudentPortalModule {}