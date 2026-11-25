import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../../entities/attendance.entity';
import { AttendanceSession } from '../../entities/attendance-session.entity';
import { ClassSection } from '../../entities/class-section.entity';
import { Enrollment } from '../../entities/enrollment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, AttendanceSession, Enrollment, ClassSection])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}