import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '../../entities/attendance.entity';

export class AttendanceRecordDto {
  @IsNumberString({}, { message: 'studentId không hợp lệ' })
  studentId: string;

  @IsEnum(AttendanceStatus, { message: 'Trạng thái điểm danh không hợp lệ' })
  status: AttendanceStatus;
}

export class SaveAttendanceDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string;

  @IsOptional()
  @IsBoolean()
  lock?: boolean;
}

export class CreateSessionDto {
  /** YYYY-MM-DD. Bỏ trống = hôm nay */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có dạng YYYY-MM-DD' })
  date?: string;
}
