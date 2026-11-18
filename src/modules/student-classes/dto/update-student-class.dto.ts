import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStudentClassDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(30)
  classCode?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  className?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  majorName?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(20)
  academicYear?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}