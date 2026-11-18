import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsModule } from './modules/students/students.module';
import { StudentClass } from './entities/student-class.entity';
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Student } from './entities/student.entity';
import { StudentStatus } from './entities/student-status.entity';
import { AdvisorClasseSection } from './entities/advisor-classe-section.entity';
import { AdvisorsModule } from './modules/advisors/advisors.module';
import { StudentStatusModule } from './modules/student-status/student-status.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StudentClassesModule } from './modules/student-classes/student-classes.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'student-management',
      entities: [
        StudentClass,
        User,
        Employee,
        Student,
        StudentStatus,
        AdvisorClasseSection,
      ],
      synchronize: false,
    }),
    StudentsModule,
    AdvisorsModule,
    StudentStatusModule,
    DashboardModule,
    StudentClassesModule,
  ],
})
export class AppModule {}