export const STATUSES = ['studying', 'suspended', 'dropped', 'graduated'] as const;
export type StudentStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<StudentStatus, string> = {
  studying: 'Đang học', suspended: 'Bảo lưu', dropped: 'Thôi học', graduated: 'Đã tốt nghiệp',
};

// Quy tắc chuyển đổi: dropped và graduated là trạng thái cuối.
export const TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  studying: ['suspended', 'dropped', 'graduated'],
  suspended: ['studying', 'dropped'],
  dropped: [],
  graduated: [],
};

export const REASON_REQUIRED: StudentStatus[] = ['suspended', 'dropped'];