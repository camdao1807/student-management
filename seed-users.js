// Tạo tài khoản users cho: 1 admin, toàn bộ giảng viên (employees), toàn bộ sinh viên (students).
// Chạy trong thư mục gốc project (cạnh package.json):   node seed-users.js
// Có thể chạy lại nhiều lần: tài khoản đã tồn tại sẽ được bỏ qua.

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

// ====== CẤU HÌNH ======
const DB = { host: 'localhost', port: 3306, user: 'root', password: '', database: 'student-management' };

// Tên role phải khớp với @Roles(...) trong code của bạn nhóm. Sửa nếu khác.
const ROLE = { admin: 'admin', lecturer: 'lecturer', student: 'student' };

const ADMIN = { username: 'admin', password: 'Admin@123', fullName: 'Quản trị viên', email: 'admin@example.com' };
const DEFAULT_PASSWORD_LECTURER = 'Lecturer@123';
const DEFAULT_PASSWORD_STUDENT = 'Student@123';
// ======================

async function main() {
  const db = await mysql.createConnection(DB);
  const created = { admin: 0, lecturer: 0, student: 0 };
  const skipped = [];

  const exists = async (username) => {
    const [r] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    return r.length > 0;
  };

  const insert = async (kind, username, password, role, fullName, email, refCode) => {
    if (await exists(username)) { skipped.push(username); return; }
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (username, password_hash, role, is_active, full_name, email, ref_code) VALUES (?,?,?,?,?,?,?)',
      [username, hash, role, 1, fullName, email, refCode],
    );
    created[kind]++;
  };

  // 1. Admin
  await insert('admin', ADMIN.username, ADMIN.password, ROLE.admin, ADMIN.fullName, ADMIN.email, null);

  // 2. Giảng viên: username = mã giảng viên
  const [emps] = await db.query('SELECT employee_code, full_name, email FROM employees WHERE is_active = 1');
  for (const e of emps) {
    await insert('lecturer', e.employee_code, DEFAULT_PASSWORD_LECTURER, ROLE.lecturer, e.full_name, e.email, e.employee_code);
  }

  // 3. Sinh viên: username = mã sinh viên (bỏ qua hồ sơ đã lưu trữ)
  const [studs] = await db.query('SELECT student_code, full_name, email FROM students WHERE deleted_at IS NULL');
  for (const s of studs) {
    await insert('student', s.student_code, DEFAULT_PASSWORD_STUDENT, ROLE.student, s.full_name, s.email, s.student_code);
  }

  console.log('Đã tạo:', created);
  if (skipped.length) console.log('Bỏ qua (đã tồn tại):', skipped.length, 'tài khoản');
  if (!emps.length) console.log('Lưu ý: bảng employees đang trống nên chưa có tài khoản giảng viên.');
  await db.end();
}

main().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });