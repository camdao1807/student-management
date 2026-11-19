import { IsIn, IsInt } from 'class-validator';

export class PrerequisiteDto {
  @IsInt({ message: 'Môn điều kiện không hợp lệ' }) prerequisiteId: number;
  @IsIn(['prerequisite', 'prior'], { message: 'Loại điều kiện không hợp lệ' }) type: string;
}
