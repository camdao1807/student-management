import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const ANNOUNCEMENT_CATEGORIES = ['general', 'holiday', 'exam', 'tuition', 'urgent'] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/;

export class SaveAnnouncementDto {
  @IsString() @IsNotEmpty({ message: 'Tiêu đề không được để trống' }) @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty({ message: 'Nội dung không được để trống' }) @MaxLength(5000)
  content: string;

  @IsIn(ANNOUNCEMENT_CATEGORIES as unknown as string[], { message: 'Loại thông báo không hợp lệ' })
  category: string;

  /** null = gửi cho toàn trường, có giá trị = chỉ gửi cho lớp đó */
  @IsOptional() @Matches(/^\d+$/, { message: 'classId không hợp lệ' })
  classId?: string | null;

  @IsOptional() @Matches(DATE_RE, { message: 'Ngày bắt đầu nghỉ không hợp lệ' })
  eventStart?: string | null;

  @IsOptional() @Matches(DATE_RE, { message: 'Ngày kết thúc nghỉ không hợp lệ' })
  eventEnd?: string | null;

  @IsOptional() @IsBoolean()
  isPinned?: boolean;

  /** yyyy-mm-dd HH:mm — để trống = gửi ngay */
  @IsOptional() @Matches(DATETIME_RE, { message: 'Giờ hẹn gửi không hợp lệ' })
  publishAt?: string | null;

  /** khi sửa: true = chuyển sang gửi ngay */
  @IsOptional() @IsBoolean()
  sendNow?: boolean;
}