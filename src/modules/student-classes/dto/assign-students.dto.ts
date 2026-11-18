import { ArrayNotEmpty, IsArray, IsNumberString } from 'class-validator';

export class AssignStudentsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Hãy chọn ít nhất 1 sinh viên' })
  @IsNumberString({}, { each: true })
  studentIds: string[];
}