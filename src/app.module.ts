import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsModule } from './modules/students/students.module';
import { StudentClass } from './entities/student-class.entity';
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Student } from './entities/student.entity';
import { StudentStatus } from './entities/student-status.entity';
import { AdvisorClasseSection } from './entities/advisor-classe-section.entity';
import { ClassSection } from './entities/class-section.entity';
import { Subject } from './entities/subject.entity';
import { Term } from './entities/term.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Grade } from './entities/grade.entity';
import { Attendance } from './entities/attendance.entity';
import { AdvisorsModule } from './modules/advisors/advisors.module';
import { StudentStatusModule } from './modules/student-status/student-status.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StudentClassesModule } from './modules/student-classes/student-classes.module';
import { CoursesModule } from './modules/courses/courses.module';
import { GradesModule } from './modules/grades/grades.module';
import { StudentPortalModule } from './modules/student-portal/student-portal.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccountsModule } from './modules/accounts/accounts.module'; // <-- THÊM

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
        ClassSection,
        Subject,
        Term,
        Enrollment,
        Grade,
        Attendance,
      ],
      synchronize: false,
    }),
    StudentsModule,
    AdvisorsModule,
    StudentStatusModule,
    DashboardModule,
    StudentClassesModule,
    StudentPortalModule,
    CoursesModule,
    GradesModule,
    AuthModule,
    UsersModule,
    AccountsModule, // <-- THÊM
  ],
})
export class AppModule {}