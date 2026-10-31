import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CheckCodeDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  /** Truyền id khi đang sửa hồ sơ để không tự báo trùng với chính mình */
  @IsOptional()
  @Matches(/^\d+$/)
  excludeId?: string;
}
