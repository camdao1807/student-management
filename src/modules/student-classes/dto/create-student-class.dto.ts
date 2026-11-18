import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStudentClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã lớp không được để trống' })
  @MaxLength(30)
  classCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên lớp không được để trống' })
  @MaxLength(150)
  className: string;

  @IsString()
  @IsNotEmpty({ message: 'Ngành học không được để trống' })
  @MaxLength(150)
  majorName: string;

  @IsString()
  @IsNotEmpty({ message: 'Niên khóa không được để trống' })
  @MaxLength(20)
  academicYear: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}