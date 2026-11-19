export const TERMS = ['2025-2026-HK1', '2025-2026-HK2', '2026-2027-HK1', '2026-2027-HK2'];
export const CURRENT_TERM = '2026-2027-HK1';
export const FAIL_ATTENDANCE = 5; // Chuyên cần dưới 5.0 → cấm thi, điểm F

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
