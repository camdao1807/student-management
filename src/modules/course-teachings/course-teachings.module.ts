import { Module } from '@nestjs/common';
import { CourseTeachingsController } from './course-teachings.controller';
import { CourseTeachingsService } from './course-teachings.service';

@Module({ controllers: [CourseTeachingsController], providers: [CourseTeachingsService] })
export class CourseTeachingsModule {}
