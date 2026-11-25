/** Giữ lại để DTO cũ (nếu có @IsIn(TERMS)) vẫn chạy. Service mới lấy học kỳ từ bảng `terms`. */
export const TERMS = ['2023-2024-HK1', '2023-2024-HK2', '2024-2025-HK1', '2024-2025-HK2', '2025-2026-HK1', '2025-2026-HK2', '2026-2027-HK1', '2026-2027-HK2'];
export const CURRENT_TERM = '2026-2027-HK1';
export const FAIL_ATTENDANCE = 5; // Chuyên cần dưới 5.0 → cấm thi, điểm F

/** Bảng `subjects` không có trọng số, dùng chung bộ trọng số mặc định (%) */
export const DEFAULT_WEIGHTS = { wAttendance: 10, wAssignment: 20, wMidterm: 20, wFinal: 50 };

/** Điểm chữ → thang 4 */
export const LETTER_GPA: Record<string, number> = {
  A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0,
};

/** Quy đổi điểm hệ 10 sang điểm chữ và thang 4. */
export function toLetter(t: number): [string, number] {
  if (t >= 8.5) return ['A', 4.0];
  if (t >= 8.0) return ['B+', 3.5];
  if (t >= 7.0) return ['B', 3.0];
  if (t >= 6.5) return ['C+', 2.5];
  if (t >= 5.5) return ['C', 2.0];
  if (t >= 5.0) return ['D+', 1.5];
  if (t >= 4.0) return ['D', 1.0];
  return ['F', 0];
}

/** terms.term_code '2026-1' → nhãn frontend '2026-2027-HK1' */
export function toTermLabel(code: string): string {
  const [y, n] = code.split('-');
  return `${y}-${Number(y) + 1}-HK${n}`;
}

/** Nhãn frontend '2026-2027-HK1' → terms.term_code '2026-1' (null nếu sai định dạng) */
export function toTermCode(label: string): string | null {
  const m = /^(\d{4})-\d{4}-HK(\d)$/.exec(label ?? '');
  return m ? `${m[1]}-${m[2]}` : null;
}