const Auth = {
  token: () => localStorage.getItem('token'),
  user: () => JSON.parse(localStorage.getItem('user') || 'null'),
  save(data) {
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.href = '/login.html';
  },
  home(role) {
    return role === 'student' ? 'student-portal.html' : 'student.html';
  },
  /** Gọi ở đầu mỗi trang: Auth.require(['admin','staff','advisor']) */
  require(roles) {
    const u = this.user();
    if (!this.token() || !u) return this.logout();
    if (roles && !roles.includes(u.role)) {
      alert('Tài khoản này không có quyền truy cập trang này');
      this.logout(); // đăng xuất thay vì chuyển trang, tránh vòng lặp
    }
  },
  /** Ẩn mục menu không đúng quyền */
  applyMenu() {
    const u = this.user();
    if (!u) return;
    const staffPages = [
      'dashboard.html', 'student.html', 'faculty.html', 'student-classes.html',
      'advisor-classe-sections.html', 'courses.html', 'grades.html', 'attendance.html',
      'student-status.html', 'user.html',
    ];
    const allowed = {
      admin: [...staffPages, 'accounts.html', 'announcements.html'],
      staff: [...staffPages, 'announcements.html'],
      advisor: staffPages,
      student: ['student-portal.html'],
    }[u.role] || [];
    document.querySelectorAll('aside a').forEach((a) => {
      const raw = a.getAttribute('href') || '';
      // Link nội bộ (#home, #register...) hoặc rỗng thì giữ nguyên
      if (!raw || raw.startsWith('#')) return;
      const href = raw.split('/').pop();
      if (!allowed.includes(href)) a.style.display = 'none';
    });
    // Mục chưa có trang (href="#") chỉ admin mới thấy
    if (u.role !== 'admin') {
      document.querySelectorAll('aside a[href="#"]').forEach((a) => (a.style.display = 'none'));
    }
  },
  /** Hiện tên người dùng + nút Đăng xuất vào #userArea (nếu trang có) */
  renderUser() {
    const u = this.user();
    const box = document.getElementById('userArea');
    if (!u || !box) return;
    const name = u.fullName || u.full_name || u.username || 'Tài khoản';
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    box.innerHTML =
      `<div class="avatar">${esc(name.trim().split(/\s+/).pop().charAt(0).toUpperCase())}</div>` +
      `<span class="user-name">${esc(name)}</span>` +
      `<a class="login-btn" href="#" id="logoutLink">Đăng xuất</a>`;
    document.getElementById('logoutLink').addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  },
};

/* Tự gắn token vào mọi request cùng domain + tự đăng xuất khi hết hạn,
   nên các trang cũ (student.html...) không cần sửa từng lệnh fetch. */
const _fetch = window.fetch.bind(window);
window.fetch = async (url, opts = {}) => {
  const isApi = typeof url === 'string' && !/^https?:\/\//.test(url) && !url.endsWith('.html');
  if (isApi && Auth.token()) {
    opts.headers = { ...(opts.headers || {}), Authorization: `Bearer ${Auth.token()}` };
  }
  const res = await _fetch(url, opts);
  if (isApi && res.status === 401 && !url.includes('/auth/login')) Auth.logout();
  return res;
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.applyMenu();
  Auth.renderUser();
});