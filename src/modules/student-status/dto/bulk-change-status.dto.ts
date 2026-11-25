import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsInt } from 'class-validator';
import { ChangeStatusDto } from './change-status.dto';

export class BulkChangeStatusDto extends ChangeStatusDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Chưa chọn sinh viên nào' })
  @ArrayMaxSize(200, { message: 'Mỗi lần chỉ đổi tối đa 200 sinh viên' })
  @ArrayUnique({ message: 'Danh sách sinh viên bị trùng' })
  @IsInt({ each: true })
  studentIds: number[];
}