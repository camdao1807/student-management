import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { StudentStatusValue } from '../../../entities/student-status.entity';

export class ChangeStatusDto {
  @IsIn(Object.values(StudentStatusValue))
  status: StudentStatusValue;

  @IsOptional()
  @IsString()
  reason?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày hiệu lực phải có dạng YYYY-MM-DD',
  })
  effectiveDate: string;
}
