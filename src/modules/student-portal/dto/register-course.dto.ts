import { IsInt, Min } from 'class-validator';

export class RegisterCourseDto {
  @IsInt()
  @Min(1)
  classSectionId: number;
}