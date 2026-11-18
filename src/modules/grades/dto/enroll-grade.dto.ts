import { IsIn, IsInt } from 'class-validator';
import { TERMS } from '../grades.constants';

export class EnrollGradeDto {
  @IsInt() courseId: number;
  @IsIn(TERMS) term: string;
  @IsInt({ message: 'Vui lòng chọn lớp' }) classId: number;
}
