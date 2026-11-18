import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const CATEGORIES = ['general', 'foundation', 'major', 'elective'] as const;
const trim = ({ value }: { value: any }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCourseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{3,20}$/, { message: 'Mã học phần gồm 3-20 chữ/số, không dấu cách' })
  code: string;

  @Transform(trim) @IsNotEmpty({ message: 'Tên môn học không được để trống' }) @MaxLength(200)
  name: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  description?: string;

  @Transform(trim) @IsNotEmpty({ message: 'Bộ môn quản lý không được để trống' }) @MaxLength(150)
  department: string;

  @IsIn(CATEGORIES as unknown as string[], { message: 'Khối kiến thức không hợp lệ' })
  category: string;

  @IsInt() @Min(0) @Max(10) theoryCredits: number;
  @IsInt() @Min(0) @Max(10) practiceCredits: number;
  @IsOptional() @IsBoolean() isRequired?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(100) wAttendance?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) wAssignment?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) wMidterm?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) wFinal?: number;

  @IsOptional() @IsBoolean() syllabusApproved?: boolean;
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}
