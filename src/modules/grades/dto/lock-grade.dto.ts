import { IsBoolean, IsIn, IsInt } from 'class-validator';
import { TERMS } from '../grades.constants';

export class LockGradeDto {
  @IsInt() courseId: number;
  @IsIn(TERMS) term: string;
  @IsBoolean() locked: boolean;
}
