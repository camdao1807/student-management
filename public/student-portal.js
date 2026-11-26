/* ===== Ô ngày dd/mm/yyyy (thay cho ô ngày mặc định của trình duyệt) ===== */
/* vn-date.js — biến mọi <input type="date"> thành ô nhập dd/mm/yyyy (có nút lịch).
   Code cũ vẫn đọc/ghi input.value dạng yyyy-mm-dd như bình thường. */
(function () {
  if (window.__vnDate) return; window.__vnDate = true;
  const getV = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  const css = document.createElement('style');
  css.textContent = `
  .vn-date{position:relative;display:block;width:100%}
  .vn-date>input.vn-txt{width:100%;padding-right:42px;box-sizing:border-box}
  .vn-date>input.vn-native{position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0}
  .vn-date>button.vn-cal{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;padding:0;border:0;border-radius:8px;background:transparent;color:#64748b;cursor:pointer;display:grid;place-items:center}
  .vn-date>button.vn-cal:hover{background:#eef2ff;color:#2563eb}
  .vn-date>button.vn-cal svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`;
  document.head.appendChild(css);

  const iso2vn = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  function vn2iso(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3], dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  function enhance(el) {
    if (el.dataset.vn) return;
    el.dataset.vn = '1';

    const wrap = document.createElement('div'); wrap.className = 'vn-date';
    const txt = document.createElement('input');
    txt.type = 'text'; txt.className = (el.className ? el.className + ' ' : '') + 'vn-txt';
    txt.placeholder = 'dd/mm/yyyy'; txt.inputMode = 'numeric'; txt.maxLength = 10; txt.autocomplete = 'off';
    txt.required = el.required; el.required = false;
    if (el.disabled) txt.disabled = true;

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vn-cal'; btn.title = 'Chọn ngày'; btn.setAttribute('aria-label', 'Chọn ngày');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

    el.parentNode.insertBefore(wrap, el);
    wrap.append(txt, el, btn);
    el.classList.add('vn-native'); el.tabIndex = -1;

    const sync = () => { txt.value = iso2vn(getV.get.call(el)); txt.setCustomValidity(''); };
    // code cũ gán el.value = '2005-07-18' -> ô hiển thị tự cập nhật
    Object.defineProperty(el, 'value', {
      get() { return getV.get.call(el); },
      set(v) { getV.set.call(el, v); sync(); },
    });
    const fire = () => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };

    txt.addEventListener('input', () => {
      const d = txt.value.replace(/\D/g, '').slice(0, 8);
      let s = d;
      if (d.length > 4) s = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
      else if (d.length > 2) s = d.slice(0, 2) + '/' + d.slice(2);
      txt.value = s;
      const iso = s.length === 10 ? vn2iso(s) : null;
      getV.set.call(el, iso || '');
      txt.setCustomValidity(s && !iso ? 'Ngày không hợp lệ, nhập theo dạng dd/mm/yyyy' : '');
      fire();
    });
    txt.addEventListener('blur', () => { if (txt.value && txt.value.length < 10) txt.setCustomValidity('Nhập đủ ngày theo dạng dd/mm/yyyy'); });

    // chọn từ lịch
    el.addEventListener('change', () => { const v = iso2vn(getV.get.call(el)); if (v !== txt.value && v) txt.value = v; });
    btn.addEventListener('click', () => {
      if (txt.disabled) return;
      try { if (!getV.get.call(el)) { const i = vn2iso(txt.value); if (i) getV.set.call(el, i); } el.showPicker(); } catch (e) { txt.focus(); }
    });

    if (el.form) el.form.addEventListener('reset', () => setTimeout(sync, 0));
    sync();
  }

  const run = () => document.querySelectorAll('input[type="date"]').forEach(enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();

// Cùng origin với server NestJS nên để rỗng. Nếu mở file này từ nơi khác thì đổi thành 'http://localhost:3000'
const API = '';

// Học kỳ đang dùng cho Trang chủ / Đăng ký / TKB / Chuyên cần. Đổi số này khi sang học kỳ mới.
const TERM_ID = 1;

// Đơn giá học phí mỗi tín chỉ (VNĐ) và tổng tín chỉ toàn khóa. Sửa cho đúng quy định của trường.
const TUITION_PER_CREDIT = 400000;
const TOTAL_CREDITS = 120;

// id sinh viên đang đăng nhập, lấy từ /student-portal/me khi mở trang
let studentId = null;

const PAGES = {
  home:       { title: 'Trang chủ',        desc: '', home: true },
  notices:    { title: 'Thông báo',        desc: 'Thông báo của nhà trường (lịch nghỉ, lịch thi…) và nhắc việc của bạn' },
  profile:    { title: 'Hồ sơ cá nhân',    desc: 'Thông tin, lớp, ngành, trạng thái học tập' },
  register:   { title: 'Đăng ký học phần', desc: 'Chọn lớp học phần đang mở (kiểm tra trùng lịch, quá sĩ số)' },
  timetable:  { title: 'Thời khóa biểu',   desc: 'Các lớp học phần đã đăng ký trong học kỳ' },
  grades:     { title: 'Điểm theo môn',    desc: 'Điểm thành phần, điểm tổng, điểm chữ' },
  transcript: { title: 'Bảng điểm',        desc: 'Điểm trung bình học kỳ, GPA tích lũy, xếp loại học lực' },
  attendance: { title: 'Chuyên cần',       desc: 'Số buổi vắng từng môn' },
  tuition:    { title: 'Học phí',          desc: 'Học phí tạm tính theo các lớp đã đăng ký trong học kỳ' },
};
const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#e11d48'];
const routeKey = () => { const k = location.hash.slice(1); return PAGES[k] ? k : 'home'; };
let current = routeKey();

// ---------- Tiện ích ----------
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sid = () => studentId;
const tid = () => TERM_ID;

const dayName = (d) => (d == null ? '—' : Number(d) === 8 ? 'Chủ nhật' : 'Thứ ' + d);
const periods = (c) => (c.startPeriod != null ? `Tiết ${c.startPeriod}–${c.endPeriod}` : 'Chưa xếp tiết');
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';
const f1 = (v) => (v == null ? '—' : Number(v).toFixed(1));
const fmtDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : s; };
const initials = (name) => (name || '').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'SV';
// Chưa biết tên field trong term.entity.ts nên thử các tên hay gặp
const termLabel = (t) => (t ? esc(t.termName ?? t.name ?? t.termCode ?? t.code ?? 'Học kỳ ' + t.id) : '—');

const ICON_EMPTY = '<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
const ICON_ERR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
const empty = (text) => `<div class="empty">${ICON_EMPTY}<div>${esc(text)}</div></div>`;

let toastTimer;
function toast(text, type = 'ok') {
  const t = $('toast');
  t.textContent = text;
  t.style.background = type === 'ok' ? 'var(--ok)' : 'var(--err)';
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

function askConfirm(text, okLabel) {
  return new Promise((resolve) => {
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    $('confirmOverlay').classList.add('show');
    const done = (v) => {
      $('confirmOverlay').classList.remove('show');
      $('confirmOk').onclick = null;
      $('confirmCancel').onclick = null;
      resolve(v);
    };
    $('confirmOk').onclick = () => done(true);
    $('confirmCancel').onclick = () => done(false);
  });
}

async function api(path, options) {
  const res = await fetch(API + '/student-portal/' + sid() + path, options);
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const m = data && data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Lỗi ' + res.status;
    throw new Error(m);
  }
  return data;
}

// Lấy id sinh viên của tài khoản đang đăng nhập
async function resolveStudent() {
  const res = await fetch(API + '/student-portal/me');
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok || !data || data.id == null) {
    const m = data && data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Lỗi ' + res.status;
    throw new Error(m || 'Không xác định được sinh viên');
  }
  studentId = data.id;
}

function table(headers, rows, centerCols = []) {
  if (!rows.length) return empty('Chưa có dữ liệu.');
  const cls = (i) => (centerCols.includes(i) ? ' class="c"' : '');
  return `<div class="tbl-wrap"><table>
    <thead><tr>${headers.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

const gradeBadge = (l) => {
  if (!l) return '<span class="badge b-mut">—</span>';
  const cls = l.startsWith('A') ? 'b-ok' : l.startsWith('B') ? 'b-pri' : l === 'F' ? 'b-err' : 'b-warn';
  return `<span class="grade ${cls}">${esc(l)}</span>`;
};

// ---------- Người dùng đang xem (sidebar + topbar) ----------
function setWho(s) {
  const ini = s?.fullName ? initials(s.fullName) : 'SV';
  $('sideAvatar').textContent = ini;
  $('topAvatar').textContent = ini;
  $('sideName').textContent = s?.fullName || 'Sinh viên';
  $('topName').textContent = s?.fullName || 'Sinh viên';
  $('topCode').textContent = s ? s.studentCode || 'Student' : 'Không tìm thấy';
  $('sideCode').textContent = s ? s.studentCode || 'Sinh viên' : 'Không tìm thấy';
}
async function refreshWho() {
  try {
    const res = await fetch(API + '/student-portal/' + sid() + '/profile');
    setWho(res.ok ? await res.json() : null);
  } catch (_) { setWho(null); }
}

// ---------- Từng tab ----------
const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS = {
  studying:  { label: 'Đang học',      cls: 'b-ok' },
  reserved:  { label: 'Bảo lưu',       cls: 'b-warn' },
  dropped:   { label: 'Thôi học',      cls: 'b-err' },
  graduated: { label: 'Đã tốt nghiệp', cls: 'b-pri' },
};
const statusBadge = (st) => {
  if (!st) return '<span class="badge b-mut">Chưa có</span>';
  const m = STATUS[st.value] || { label: st.value, cls: 'b-mut' };
  return `<span class="badge ${m.cls}">${esc(m.label)}</span>`;
};

const QICON = {
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  reg: '<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
  pulse: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  money: '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};


// ---------- Giao diện bổ sung ----------
(function injectStyle() {
  const st = document.createElement('style');
  st.textContent = `
  .top-right{display:flex;align-items:center;gap:10px}
  .bell-wrap{position:relative}
  .bell{position:relative;width:42px;height:42px;padding:0;border-radius:12px;border:1px solid var(--bd,#e5e9f2);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--mut,#64748b)}
  .bell:hover{color:var(--pri,#2563eb)}
  .bell svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .bell-dot,.nav-badge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
  .bell-dot{position:absolute;top:-6px;right:-6px}
  .nav-badge{margin-left:auto}
  .bell-dot[hidden],.nav-badge[hidden]{display:none}
  .bell-menu{display:none;position:absolute;right:0;top:50px;width:350px;max-width:calc(100vw - 32px);background:#fff;border:1px solid var(--bd,#e5e9f2);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.14);padding:10px;z-index:60}
  .bell-menu.show{display:block}
  .bell-menu h4{margin:4px 6px 8px;font-size:14px}
  .bell-menu .notice{border:0;padding:10px 8px}
  .bell-menu .more{display:block;text-align:center;padding:8px;font-size:13px;font-weight:600;color:var(--pri,#2563eb);text-decoration:none}
  .notice-list{display:grid;gap:10px}
  .notice{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--bd,#e5e9f2);border-radius:12px;background:#fff;color:inherit;text-decoration:none}
  a.notice:hover{border-color:var(--pri,#2563eb)}
  .notice .n-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none}
  .notice .n-ico svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .notice.warn .n-ico{background:#fef2f2;color:#dc2626}
  .notice.info .n-ico{background:#eff6ff;color:#2563eb}
  .notice.ok .n-ico{background:#f0fdf4;color:#16a34a}
  .notice b{display:block;font-size:14px}
  .notice .n-text{display:block;font-size:13px;color:var(--mut,#64748b);margin-top:2px;line-height:1.45}
  .prog{height:10px;border-radius:999px;background:#eef1f7;overflow:hidden}
  .prog i{display:block;height:100%;border-radius:999px;background:var(--pri,#2563eb)}
  .prog-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:6px}
  .head-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 10px}
  .head-row h3{margin:0}
  .tools{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
  .tools select,.tools input{padding:9px 12px;border:1px solid var(--bd,#e5e9f2);border-radius:10px;background:#fff;font:inherit}
  .tools input{min-width:220px}
  .note-box{margin-top:14px;padding:12px 14px;border-radius:10px;background:#f6f8fc;color:var(--mut,#64748b);font-size:13px;line-height:1.5}
  .notice.unread{border-color:#bfdbfe;background:#f8fbff}
  .notice .n-meta{display:block;font-size:12px;color:#94a3b8;margin-top:4px}
  .dot-new{display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563eb;margin-right:6px;vertical-align:middle}
  .ann-tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .ann-title{margin:10px 0 4px;font-size:20px}
  .ann-body{white-space:pre-wrap;line-height:1.65;margin-top:14px}
  .ann-holiday{margin-top:14px;padding:12px 14px;border-radius:10px;background:#fff7ed;color:#c2410c;font-weight:600}
  .bell-menu .bm-head{display:flex;justify-content:space-between;align-items:center;margin:4px 6px 8px}
  .bell-menu .bm-head h4{margin:0}
  .bell-menu .bm-head button{border:0;background:transparent;color:var(--pri,#2563eb);font-size:12px;font-weight:600;cursor:pointer;padding:0}
  @media print{.sidebar,.topbar,.page-head,.no-print{display:none!important}.layout{display:block!important}.content{margin:0!important;padding:0!important}}
  `;
  document.head.appendChild(st);
})();

// ---------- Thông báo (tự tính từ dữ liệu của chính sinh viên) ----------
const NICON = {
  warn: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  mega: '<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  ok:   '<svg viewBox="0 0 24 24"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14 9 11"/></svg>',
};
let notices = [];

// Thông báo do nhà trường đăng (admin soạn ở trang Thông báo sinh viên)
const ANN_CAT = {
  general: { label: 'Thông báo chung', bg: '#eff6ff', fg: '#2563eb' },
  holiday: { label: 'Lịch nghỉ',       bg: '#fff7ed', fg: '#c2410c' },
  exam:    { label: 'Lịch thi',        bg: '#f5f3ff', fg: '#7c3aed' },
  tuition: { label: 'Học phí',         bg: '#f0fdf4', fg: '#15803d' },
  urgent:  { label: 'Khẩn',            bg: '#fef2f2', fg: '#dc2626' },
};
let announcements = [];
let annUnread = 0;
let annChanged = false;
const fmtDT = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || ''); return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}` : ''; };

async function loadAnnouncements() {
  try {
    const res = await fetch(API + '/announcements/me');
    if (!res.ok) throw new Error();
    const d = await res.json();
    announcements = d.items || [];
    annUnread = d.unread || 0;
  } catch (_) { announcements = []; annUnread = 0; }   // chưa cài backend thì bỏ qua, không báo lỗi
}

function annHtml(a) {
  const m = ANN_CAT[a.category] || ANN_CAT.general;
  const snip = String(a.content || '').replace(/\s+/g, ' ').slice(0, 100);
  return `
  <a class="notice ann ${a.isRead ? 'read' : 'unread'}" href="#" onclick="openAnn(${Number(a.id)});return false">
    <span class="n-ico" style="background:${m.bg};color:${m.fg}">${NICON.mega}</span>
    <div>
      <b>${a.isRead ? '' : '<i class="dot-new"></i>'}${a.isPinned ? '📌 ' : ''}${esc(a.title)}</b>
      <span class="n-text">${esc(snip)}${String(a.content || '').length > 100 ? '…' : ''}</span>
      <span class="n-meta">${m.label} · ${fmtDT(a.publishAt)}</span>
    </div>
  </a>`;
}

// Thông báo của trường trước, rồi tới nhắc việc cá nhân
function feedHtml(limit) {
  const personal = [...notices.filter((n) => n.type !== 'ok'), ...notices.filter((n) => n.type === 'ok')];
  const parts = [...announcements.map(annHtml), ...personal.map(noticeHtml)];
  return parts.slice(0, limit).join('') || '<div class="cap-note">Chưa có thông báo.</div>';
}

async function openAnn(id) {
  const a = announcements.find((x) => Number(x.id) === id);
  if (!a) return;
  const m = ANN_CAT[a.category] || ANN_CAT.general;
  const range = a.eventEnd && a.eventEnd !== a.eventStart
    ? `từ ngày ${fmtDate(a.eventStart)} đến hết ngày ${fmtDate(a.eventEnd)}` : `ngày ${fmtDate(a.eventStart)}`;
  $('annBody').innerHTML = `
    <span class="ann-tag" style="background:${m.bg};color:${m.fg}">${m.label}</span>
    <h2 class="ann-title">${a.isPinned ? '📌 ' : ''}${esc(a.title)}</h2>
    <div class="sub">Đăng lúc ${fmtDT(a.publishAt)} · Gửi tới: ${a.classId ? 'lớp của bạn' : 'toàn trường'}</div>
    ${a.eventStart ? `<div class="ann-holiday">📅 Nghỉ học ${range}</div>` : ''}
    <div class="ann-body">${esc(a.content)}</div>`;
  $('annOverlay').classList.add('show');
  if (!a.isRead) {
    try {
      const r = await fetch(API + '/announcements/me/' + id + '/read', { method: 'POST' });
      if (r.ok) { a.isRead = true; annUnread = Math.max(0, annUnread - 1); annChanged = true; updateBell(); }
    } catch (_) {}
  }
}
// Cập nhật chuông khi nhà trường vừa gửi thông báo mới (không cần F5)
async function refreshBell() {
  const before = announcements.map((a) => a.id).join(',');
  await loadAnnouncements();
  updateBell();
  const after = announcements.map((a) => a.id).join(',');
  if (before !== after && (current === 'home' || current === 'notices')) render(current);
}
function closeAnn() {
  $('annOverlay').classList.remove('show');
  if (annChanged) { annChanged = false; if (current === 'home' || current === 'notices') render(current); }
}
async function markAllRead() {
  try {
    const r = await fetch(API + '/announcements/me/read-all', { method: 'POST' });
    if (!r.ok) throw new Error();
    announcements.forEach((a) => { a.isRead = true; });
    annUnread = 0; updateBell();
    if (current === 'home' || current === 'notices') render(current);
  } catch (_) { toast('Không đánh dấu được, thử lại sau', 'err'); }
}

const noticeHtml = (n) => `
  <a class="notice ${n.type}" href="${n.href || '#notices'}">
    <span class="n-ico">${NICON[n.type]}</span>
    <div><b>${esc(n.title)}</b><span class="n-text">${esc(n.text)}</span></div>
  </a>`;

async function loadNotices() {
  await loadAnnouncements();
  const [prof, t, att, tt] = await Promise.all([
    api('/profile').catch(() => null),
    api('/transcript').catch(() => null),
    api('/attendance?termId=' + tid()).catch(() => []),
    api('/timetable?termId=' + tid()).catch(() => []),
  ]);
  const list = [];
  const st = prof?.status?.value;
  if (st && st !== 'studying') {
    list.push({ type: 'warn', title: 'Trạng thái học tập: ' + (STATUS[st]?.label || st), text: prof.status.reason || 'Liên hệ phòng đào tạo nếu bạn có thắc mắc.', href: '#profile' });
  }
  if (t && Number(t.totalCredits) > 0 && Number(t.cumulativeGpa) < 2) {
    list.push({ type: 'warn', title: 'Cảnh báo học vụ', text: `GPA tích lũy ${Number(t.cumulativeGpa).toFixed(2)}/4, thấp hơn mức 2.0. Hãy gặp cố vấn học tập để được hỗ trợ.`, href: '#transcript' });
  }
  (att || []).forEach((a) => {
    if (a.absentRate >= 20) list.push({ type: 'warn', title: 'Nguy cơ cấm thi: ' + a.subject, text: `Bạn đã vắng ${a.absent}/${a.total} buổi (${a.absentRate}%).`, href: '#attendance' });
    else if (a.absentRate >= 10) list.push({ type: 'info', title: 'Lưu ý chuyên cần: ' + a.subject, text: `Bạn đã vắng ${a.absent}/${a.total} buổi (${a.absentRate}%).`, href: '#attendance' });
  });
  if (!tt || !tt.length) {
    list.push({ type: 'info', title: 'Chưa đăng ký học phần', text: `Bạn chưa đăng ký lớp nào ở học kỳ ${tid()}.`, href: '#register' });
  } else {
    const cr = tt.reduce((s, c) => s + (c.subject?.credits || 0), 0);
    list.push({ type: 'ok', title: `Đã đăng ký ${tt.length} lớp · ${cr} tín chỉ`, text: `Học phí tạm tính: ${money(cr * TUITION_PER_CREDIT)}.`, href: '#tuition' });
  }
  if (!list.some((n) => n.type !== 'ok')) list.push({ type: 'ok', title: 'Mọi thứ đều ổn', text: 'Hiện chưa có cảnh báo nào dành cho bạn.' });

  notices = list;
  updateBell();
  return list;
}

function updateBell() {
  const n = notices.filter((x) => x.type !== 'ok').length + annUnread;
  const dot = $('bellCount'), badge = $('navNoticeCount');
  dot.textContent = n; dot.hidden = !n;
  badge.textContent = n; badge.hidden = !n;
  $('bellMenu').innerHTML = `
    <div class="bm-head"><h4>Thông báo</h4>${annUnread ? '<button type="button" onclick="markAllRead()">Đánh dấu đã đọc tất cả</button>' : ''}</div>
    <div class="notice-list">${feedHtml(5)}</div>
    <a class="more" href="#notices">Xem tất cả</a>`;
}

const views = {
  async home() {
    const [s, t, tt] = await Promise.all([
      api('/profile'),
      api('/transcript').catch(() => null),
      api('/timetable?termId=' + tid()).catch(() => []),
    ]);
    setWho(s);
    const ns = await loadNotices();

    const js = new Date().getDay();
    const dow = js === 0 ? 8 : js + 1;
    const today = tt.filter((c) => Number(c.dayOfWeek) === dow);
    const credits = tt.reduce((sum, c) => sum + (c.subject?.credits || 0), 0);
    const gpa = t ? Number(t.cumulativeGpa) || 0 : 0;
    const gpaPct = Math.min(100, Math.round((gpa / 4) * 100));
    const passed = t ? t.passedCredits : 0;
    const counted = t ? t.totalCredits : 0;
    const credPct = counted ? Math.round((passed / counted) * 100) : 0;

    const q = (href, color, icon, small, title, desc) => `
      <a class="qcard" href="${href}">
        <div class="qicon" style="background:${color}">${QICON[icon]}</div>
        <div><small>${small}</small><b>${title}</b><span>${desc}</span></div>
      </a>`;

    const todayHtml = today.length
      ? today.map((c) => `<div class="today-item">
          <span class="t">${periods(c)}</span>
          <div><b>${esc(c.subject?.subjectName)}</b><span class="sub">${c.room ? 'Phòng ' + esc(c.room) : 'Chưa có phòng'} · ${esc(c.sectionCode)}</span></div>
        </div>`).join('')
      : '<div class="cap-note" style="padding:20px 0">Hôm nay bạn không có lớp nào.</div>';

    return `
      <div class="banner">
        <h2>Chào ${esc(s.fullName)} 👋</h2>
        <p>Chúc bạn một ngày học tập hiệu quả</p>
        <span class="chip">Học kỳ hiện tại: ${esc(tid())}</span>
      </div>

      <div class="quick">
        ${q('#timetable', '#2563eb', 'cal', 'Tra cứu', 'Thời khóa biểu', 'TKB các lớp đã đăng ký')}
        ${q('#register', '#0891b2', 'reg', 'Thực hiện', 'Đăng ký học phần', 'Chọn lớp đang mở')}
        ${q('#grades', '#9333ea', 'pulse', 'Tra cứu', 'Kết quả học tập', 'Xem điểm các học phần')}
        ${q('#attendance', '#d97706', 'clock', 'Theo dõi', 'Chuyên cần', 'Số buổi vắng từng môn')}
        ${q('#tuition', '#16a34a', 'money', 'Tra cứu', 'Học phí', 'Tạm tính theo tín chỉ')}
      </div>

      <div class="home-grid">
        <div class="card">
          <h3><i></i>GPA hiện tại</h3>
          <div class="ring" style="--p:${gpaPct}"><b>${gpa.toFixed(2)}</b></div>
          <div class="cap-note">Hệ 4 · Xếp loại: <b>${esc(t?.classification || '—')}</b></div>
        </div>
        <div class="card">
          <h3><i></i>Tín chỉ tích lũy</h3>
          <div class="ring" style="--p:${credPct}"><b>${esc(passed)}</b></div>
          <div class="cap-note">Đạt ${esc(passed)} / ${esc(counted)} tín chỉ đã tính điểm</div>
        </div>
        <div class="card">
          <h3><i></i>Học kỳ này</h3>
          <div class="big">${tt.length}</div>
          <div class="cap-note">lớp học phần · ${credits} tín chỉ</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="head-row" style="margin:0 0 12px"><h3><i></i>Thông báo</h3><a href="#notices" style="font-size:13px;font-weight:600">Xem tất cả</a></div>
        <div class="notice-list">${feedHtml(5)}</div>
      </div>

      <div class="card">
        <h3><i></i>Lịch học hôm nay (${dayName(dow)})</h3>
        ${todayHtml}
      </div>`;
  },

  async profile() {
    const [s, t] = await Promise.all([api('/profile'), api('/transcript').catch(() => null)]);
    setWho(s);
    const c = s.class;
    const st = s.status;
    const item = (k, v) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
    const sec = (title) => `<div class="head-row"><h3>${title}</h3></div>`;
    const passed = t ? Number(t.passedCredits) || 0 : 0;
    const pct = Math.min(100, Math.round((passed / TOTAL_CREDITS) * 100));
    return `
      <div class="hero">
        <div class="avatar-lg">${esc(initials(s.fullName))}</div>
        <div class="hero-info"><h2>${esc(s.fullName)}</h2><p>${esc(s.studentCode)}${c ? ' · ' + esc(c.className) : ''}</p></div>
        <button class="primary no-print" onclick="openEdit()">Chỉnh sửa thông tin</button>
      </div>

      ${sec('Thông tin cá nhân')}
      <div class="info">
        ${item('Mã sinh viên', esc(s.studentCode))}
        ${item('Họ và tên', esc(s.fullName))}
        ${item('Ngày sinh', esc(fmtDate(s.dateOfBirth)))}
        ${item('Giới tính', esc(GENDER[s.gender] || s.gender))}
        ${item('Quê quán', esc(s.hometown))}
      </div>

      ${sec('Thông tin liên hệ')}
      <div class="info">
        ${item('Email', esc(s.email))}
        ${item('Số điện thoại', esc(s.phone))}
      </div>

      ${sec('Thông tin học tập')}
      <div class="info">
        ${item('Lớp', c ? `${esc(c.className)}<span class="sub">${esc(c.classCode)}</span>` : '—')}
        ${item('Ngành', esc(c?.majorName))}
        ${item('Niên khóa', esc(c?.academicYear))}
        ${item('Trạng thái học tập', statusBadge(st) + (st ? `<span class="sub">Từ ${esc(fmtDate(st.effectiveDate))}${st.reason ? ' · ' + esc(st.reason) : ''}</span>` : ''))}
        ${item('GPA tích lũy (hệ 4)', t ? `<b>${esc(t.cumulativeGpa)}</b><span class="sub">${esc(t.classification)}</span>` : '—')}
      </div>

      ${sec('Tiến độ học tập')}
      <div class="prog-row"><span>Đã tích lũy <b>${passed}</b> / ${TOTAL_CREDITS} tín chỉ</span><b>${pct}%</b></div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="sub" style="margin-top:6px">Tổng tín chỉ toàn khóa được đặt trong <code>TOTAL_CREDITS</code> (hiện là ${TOTAL_CREDITS}).</div>`;
  },

  async register() {
    const [open, mine, prof] = await Promise.all([
      api('/sections/open?termId=' + tid()),
      api('/timetable?termId=' + tid()),
      api('/profile'),
    ]);
    const mineMap = new Map(mine.map((c) => [String(c.id), c.enrollmentId]));
    const credits = mine.reduce((sum, c) => sum + (c.subject?.credits || 0), 0);

    const stats = `
      <div class="stats">
        <div class="stat pri"><div class="l">Lớp đã đăng ký</div><div class="n">${mine.length}</div></div>
        <div class="stat"><div class="l">Tổng tín chỉ</div><div class="n">${credits}</div></div>
        <div class="stat"><div class="l">Lớp đang mở</div><div class="n">${open.length}</div></div>
      </div>`;

    const rows = open.map((c) => {
      const isMine = mineMap.has(String(c.id));
      const full = c.enrolledCount >= c.maxStudents;
      const pct = c.maxStudents ? Math.min(100, Math.round((c.enrolledCount / c.maxStudents) * 100)) : 0;
      const barCls = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
      const action = isMine
        ? `<span class="badge b-ok">Đã đăng ký</span> <button class="sm danger" onclick="cancelCourse(${Number(mineMap.get(String(c.id)))})">Hủy</button>`
        : full
          ? '<span class="badge b-err">Đã đầy</span>'
          : `<button class="sm primary" onclick="registerCourse(${Number(c.id)})">Đăng ký</button>`;
      return [
        `<b>${esc(c.sectionCode)}</b>`,
        `${esc(c.subject?.subjectName)}<span class="sub">${esc(c.subject?.subjectCode)} · ${esc(c.subject?.credits)} tín chỉ · ${c.subject?.majorName ? esc(c.subject.majorName) : 'Môn chung'}</span>`,
        `${dayName(c.dayOfWeek)}<span class="sub">${periods(c)}</span>`,
        esc(c.room),
        `<div class="cap"><div class="track"><i class="${barCls}" style="width:${pct}%"></i></div><span>${esc(c.enrolledCount)}/${esc(c.maxStudents)}</span></div>`,
        action,
      ];
    });
    const major = prof.class?.majorName;
    const note = `<div class="sub" style="margin:-6px 0 12px">Hiển thị các lớp thuộc ngành ${major ? '<b>' + esc(major) + '</b>' : 'của bạn'} và các môn chung.</div>`;
    return stats + `<div class="sec-title"><h3>Lớp học phần đang mở</h3></div>` + note + table(['Mã lớp', 'Môn học', 'Lịch học', 'Phòng', 'Sĩ số', ''], rows);
  },

  async timetable() {
    const list = await api('/timetable?termId=' + tid());
    if (!list.length) return empty('Bạn chưa đăng ký lớp nào trong học kỳ này.');

    const days = [2, 3, 4, 5, 6, 7, 8];
    const slot = (c) => {
      const color = PALETTE[Number(c.subject?.id || c.subjectId || 0) % PALETTE.length];
      return `<div class="slot" style="border-left-color:${color}">
        <b>${esc(c.subject?.subjectName)}</b>
        <span>${periods(c)}</span>
        <span>${c.room ? 'Phòng ' + esc(c.room) : 'Chưa có phòng'} · ${esc(c.sectionCode)}</span>
      </div>`;
    };
    const board = days.map((d) => {
      const items = list.filter((c) => Number(c.dayOfWeek) === d);
      return `<div class="day ${items.length ? 'has' : ''}"><h4>${dayName(d)}</h4>${items.length ? items.map(slot).join('') : '<div class="none">Không có lớp</div>'}</div>`;
    }).join('');

    const unscheduled = list.filter((c) => c.dayOfWeek == null);
    return `<div class="week">${board}</div>` + (unscheduled.length
      ? `<h3 style="margin-top:20px">Chưa xếp lịch</h3><div class="week">${unscheduled.map(slot).join('')}</div>` : '');
  },

  async grades() {
    gradesCache = await api('/grades');
    const terms = [...new Map(gradesCache.map((g) => {
      const tm = g.enrollment?.section?.term;
      return [String(tm?.id ?? ''), termLabel(tm)];
    })).entries()];
    const total = gradesCache.length;
    const ok = gradesCache.filter((g) => g.isPassed === true).length;
    const bad = gradesCache.filter((g) => g.isPassed === false).length;
    return `
      <div class="stats">
        <div class="stat pri"><div class="l">Số môn</div><div class="n">${total}</div></div>
        <div class="stat"><div class="l">Đạt</div><div class="n">${ok}</div></div>
        <div class="stat"><div class="l">Không đạt</div><div class="n">${bad}</div></div>
      </div>
      <div class="tools">
        <select id="gTerm" onchange="filterGrades()"><option value="">Tất cả học kỳ</option>${terms.map(([id, name]) => `<option value="${esc(id)}">${name}</option>`).join('')}</select>
        <input id="gQ" placeholder="Tìm tên hoặc mã môn..." oninput="filterGrades()">
      </div>
      <div id="gBody">${gradeTable(gradesCache)}</div>`;
  },

  async transcript() {
    const [t, gs] = await Promise.all([api('/transcript'), api('/grades').catch(() => [])]);
    const stats = `
      <div class="stats">
        <div class="stat pri"><div class="l">GPA tích lũy (hệ 4)</div><div class="n">${esc(t.cumulativeGpa)}</div></div>
        <div class="stat"><div class="l">Xếp loại học lực</div><div class="n sm">${esc(t.classification)}</div></div>
        <div class="stat"><div class="l">Tín chỉ đã tính điểm</div><div class="n">${esc(t.totalCredits)}</div></div>
        <div class="stat"><div class="l">Tín chỉ đạt</div><div class="n">${esc(t.passedCredits)}</div></div>
      </div>`;
    const rows = t.terms.map((x) => {
      const pct = Math.min(100, Math.round((x.gpa / 4) * 100));
      return [
        `<b>${esc(x.term)}</b>`, esc(x.credits),
        `<div class="cap"><div class="track"><i style="width:${pct}%"></i></div><span><b>${esc(x.gpa)}</b> / 4</span></div>`,
      ];
    });

    // Chi tiết từng học kỳ
    const byTerm = new Map();
    gs.forEach((g) => {
      const key = termLabel(g.enrollment?.section?.term);
      if (!byTerm.has(key)) byTerm.set(key, []);
      byTerm.get(key).push(g);
    });
    const detail = [...byTerm.entries()].map(([name, list]) => `
      <div class="head-row"><h3>${name}</h3></div>
      ${table(['Môn học', 'Mã môn', 'Tín chỉ', 'Tổng kết', 'Điểm chữ', 'Kết quả'], list.map((g) => {
        const sub = g.enrollment?.section?.subject;
        const result = g.isPassed == null ? '<span class="badge b-mut">Chưa có</span>'
          : g.isPassed ? '<span class="badge b-ok">Đạt</span>' : '<span class="badge b-err">Không đạt</span>';
        return [esc(sub?.subjectName), esc(sub?.subjectCode), esc(sub?.credits), `<b>${f1(g.totalScore)}</b>`, gradeBadge(g.letterGrade), result];
      }), [2, 3, 4])}`).join('');

    return `<div class="head-row no-print" style="margin-top:0"><span></span><button class="sm primary" onclick="window.print()">In bảng điểm</button></div>`
      + stats
      + `<div class="head-row"><h3>GPA theo học kỳ</h3></div>` + table(['Học kỳ', 'Số tín chỉ', 'GPA học kỳ'], rows)
      + (detail ? `<div class="head-row"><h3>Chi tiết điểm từng học kỳ</h3></div>` + detail : '');
  },

  async notices() {
    const list = await loadNotices();
    return `
      <div class="head-row" style="margin-top:0"><h3>Thông báo từ nhà trường</h3>${annUnread ? '<button class="sm no-print" onclick="markAllRead()">Đánh dấu đã đọc tất cả</button>' : ''}</div>
      ${announcements.length ? `<div class="notice-list">${announcements.map(annHtml).join('')}</div>` : '<div class="cap-note" style="padding:14px 0">Nhà trường chưa gửi thông báo nào.</div>'}
      <div class="head-row"><h3>Nhắc việc dành riêng cho bạn</h3></div>
      <div class="notice-list">${list.map(noticeHtml).join('')}</div>
      <div class="note-box">Nhắc việc được tạo tự động từ dữ liệu học tập của bạn: trạng thái học vụ, GPA, chuyên cần và đăng ký học phần.</div>`;
  },

  async tuition() {
    const list = await api('/timetable?termId=' + tid());
    if (!list.length) return empty('Bạn chưa đăng ký lớp nào trong học kỳ này nên chưa phát sinh học phí.');
    const credits = list.reduce((s, c) => s + (Number(c.subject?.credits) || 0), 0);
    const rows = list.map((c) => {
      const cr = Number(c.subject?.credits) || 0;
      return [
        `<b>${esc(c.sectionCode)}</b>`,
        `${esc(c.subject?.subjectName)}<span class="sub">${esc(c.subject?.subjectCode)}</span>`,
        cr, money(TUITION_PER_CREDIT), `<b>${money(cr * TUITION_PER_CREDIT)}</b>`,
      ];
    });
    return `
      <div class="stats">
        <div class="stat"><div class="l">Số lớp đã đăng ký</div><div class="n">${list.length}</div></div>
        <div class="stat"><div class="l">Tổng tín chỉ</div><div class="n">${credits}</div></div>
        <div class="stat pri"><div class="l">Học phí tạm tính</div><div class="n sm">${money(credits * TUITION_PER_CREDIT)}</div></div>
      </div>
      <div class="head-row"><h3>Chi tiết học phần</h3><button class="sm no-print" onclick="window.print()">In phiếu</button></div>
      ${table(['Mã lớp', 'Môn học', 'Tín chỉ', 'Đơn giá / tín chỉ', 'Thành tiền'], rows, [2, 3, 4])}
      <div class="note-box">Số tiền được tính theo đơn giá ${money(TUITION_PER_CREDIT)} mỗi tín chỉ và chưa trừ miễn giảm. Thông tin chính thức xem tại phòng Kế hoạch – Tài chính.</div>`;
  },

  async attendance() {
    const list = await api('/attendance?termId=' + tid());
    if (!list.length) return empty('Chưa có dữ liệu chuyên cần trong học kỳ này.');
    const label = { absent: 'Vắng', late: 'Trễ', excused: 'Vắng có phép' };
    const cls = { absent: 'b-err', late: 'b-warn', excused: 'b-pri' };
    const seg = (n, total, color) => (n ? `<i style="width:${(n / total) * 100}%;background:${color}"></i>` : '');

    return list.map((s) => {
      const rateCls = s.absentRate >= 20 ? 'b-err' : s.absentRate >= 10 ? 'b-warn' : 'b-ok';
      return `<div class="att">
        <div class="att-head">
          <h3>${esc(s.subject)}</h3>
          <span class="badge ${rateCls}">Vắng ${esc(s.absentRate)}% · ${esc(s.absent)}/${esc(s.total)} buổi</span>
        </div>
        <div class="stack">${seg(s.present, s.total, '#16a34a')}${seg(s.late, s.total, '#d97706')}${seg(s.excused, s.total, '#2563eb')}${seg(s.absent, s.total, '#dc2626')}</div>
        <div class="legend">
          <span><i class="dot" style="background:#16a34a"></i>Có mặt<b>${esc(s.present)}</b></span>
          <span><i class="dot" style="background:#d97706"></i>Trễ<b>${esc(s.late)}</b></span>
          <span><i class="dot" style="background:#2563eb"></i>Có phép<b>${esc(s.excused)}</b></span>
          <span><i class="dot" style="background:#dc2626"></i>Vắng<b>${esc(s.absent)}</b></span>
        </div>
        ${s.details.length
          ? table(['Ngày', 'Trạng thái', 'Ghi chú'], s.details.map((d) => [fmtDate(d.date), `<span class="badge ${cls[d.status] || 'b-mut'}">${esc(label[d.status] || d.status)}</span>`, esc(d.note || '')]))
          : '<div class="sub">Không có buổi vắng hoặc trễ.</div>'}
      </div>`;
    }).join('');
  },
};


// ---------- Điểm theo môn: bảng + bộ lọc ----------
let gradesCache = [];
function gradeTable(list) {
  return table(
    ['Môn học', 'Học kỳ', 'Chuyên cần', 'Giữa kỳ', 'Cuối kỳ', 'Tổng kết', 'Điểm chữ', 'Kết quả'],
    list.map((g) => {
      const sec = g.enrollment?.section;
      const result = g.isPassed == null ? '<span class="badge b-mut">Chưa có</span>'
        : g.isPassed ? '<span class="badge b-ok">Đạt</span>' : '<span class="badge b-err">Không đạt</span>';
      return [
        `${esc(sec?.subject?.subjectName)}<span class="sub">${esc(sec?.subject?.subjectCode)} · ${esc(sec?.subject?.credits)} tín chỉ</span>`,
        termLabel(sec?.term),
        f1(g.attendanceScore), f1(g.midtermScore), f1(g.finalScore),
        `<b>${f1(g.totalScore)}</b>`, gradeBadge(g.letterGrade), result,
      ];
    }),
    [2, 3, 4, 5, 6, 7]
  );
}
function filterGrades() {
  const term = $('gTerm').value;
  const q = $('gQ').value.trim().toLowerCase();
  const list = gradesCache.filter((g) => {
    const sec = g.enrollment?.section;
    if (term && String(sec?.term?.id ?? '') !== term) return false;
    if (!q) return true;
    return `${sec?.subject?.subjectName || ''} ${sec?.subject?.subjectCode || ''}`.toLowerCase().includes(q);
  });
  $('gBody').innerHTML = gradeTable(list);
}

// ---------- Hành động ----------
async function registerCourse(classSectionId) {
  try {
    await api('/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classSectionId }),
    });
    await render('register');
    loadNotices();
    toast('Đăng ký thành công');
  } catch (e) { toast(e.message, 'err'); }
}

async function cancelCourse(enrollmentId) {
  if (!(await askConfirm('Bạn chắc chắn muốn hủy đăng ký lớp học phần này?', 'Hủy đăng ký'))) return;
  try {
    await api('/enrollments/' + enrollmentId, { method: 'DELETE' });
    await render('register');
    loadNotices();
    toast('Đã hủy đăng ký');
  } catch (e) { toast(e.message, 'err'); }
}

// ----- Chỉnh sửa hồ sơ cá nhân -----
async function openEdit() {
  try {
    const s = await api('/profile');
    $('fDob').value = (s.dateOfBirth || '').slice(0, 10);
    $('fGender').value = s.gender || '';
    $('fEmail').value = s.email || '';
    $('fPhone').value = s.phone || '';
    $('fHometown').value = s.hometown || '';
    $('editOverlay').classList.add('show');
  } catch (e) { toast(e.message, 'err'); }
}

function closeEdit() { $('editOverlay').classList.remove('show'); }

async function saveProfile(ev) {
  ev.preventDefault();
  const email = $('fEmail').value.trim();
  const dob = $('fDob').value;
  if (!email) return toast('Email không được để trống', 'err');
  const dobText = document.querySelector('#fDob')?.parentNode.querySelector('.vn-txt')?.value || '';
  if (dobText && !dob) return toast('Ngày sinh chưa hợp lệ, nhập theo dạng dd/mm/yyyy', 'err');
  if (dob && dob > new Date().toLocaleDateString('en-CA')) {
    return toast('Ngày sinh không được nằm trong tương lai', 'err');
  }

  const body = { email, hometown: $('fHometown').value.trim() };
  // Trường để trống thì không gửi, tránh bị validator báo lỗi
  if (dob) body.dateOfBirth = dob;
  if ($('fGender').value) body.gender = $('fGender').value;
  if ($('fPhone').value.trim()) body.phone = $('fPhone').value.trim();

  $('saveBtn').disabled = true;
  try {
    await api('/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    closeEdit();
    await Promise.all([refreshWho(), render('profile')]);
    toast('Đã cập nhật thông tin');
  } catch (e) { toast(e.message, 'err'); }
  finally { $('saveBtn').disabled = false; }
}

// ----- Đổi mật khẩu -----
function openPwd() {
  $('pwdForm').reset();
  $('pwdOverlay').classList.add('show');
  $('pwdOld').focus();
}
function closePwd() { $('pwdOverlay').classList.remove('show'); }

async function savePassword(ev) {
  ev.preventDefault();
  const currentPassword = $('pwdOld').value;
  const newPassword = $('pwdNew').value;
  if (!currentPassword) return toast('Vui lòng nhập mật khẩu hiện tại', 'err');
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return toast('Mật khẩu mới tối thiểu 8 ký tự, gồm cả chữ và số', 'err');
  }
  if (newPassword !== $('pwdNew2').value) return toast('Mật khẩu nhập lại không khớp', 'err');

  $('pwdSave').disabled = true;
  try {
    const res = await fetch(API + '/student-portal/me/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const m = data && data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Lỗi ' + res.status;
      throw new Error(m);
    }
    closePwd();
    toast('Đổi mật khẩu thành công');
  } catch (e) { toast(e.message, 'err'); }
  finally { $('pwdSave').disabled = false; }
}

let renderSeq = 0;
async function render(key) {
  current = key;
  const seq = ++renderSeq;   // tránh trang cũ tải chậm ghi đè trang mới khi bấm menu nhanh
  document.querySelectorAll('.nav-item[data-key]').forEach((a) => a.classList.toggle('active', a.dataset.key === key));
  const pg = PAGES[key];
  $('pageTitle').textContent = pg.title;
  $('pageDesc').textContent = pg.desc;
  $('crumbPage').textContent = pg.title;
  $('pageHead').classList.toggle('hide', !!pg.home);
  $('content').classList.toggle('panel', !pg.home);   // trang chủ không bọc khung trắng
  document.title = pg.title + ' - Cổng sinh viên';
  $('content').innerHTML = '<div class="loading"><div class="spin"></div>Đang tải...</div>';
  try {
    const out = await views[key]();
    if (seq === renderSeq) $('content').innerHTML = out;
  } catch (e) {
    if (seq === renderSeq) $('content').innerHTML = `<div class="empty err">${ICON_ERR}<div>${esc(e.message)}</div></div>`;
  }
}

// ----- Menu người dùng góc phải -----
$('userBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('userMenu').classList.toggle('show');
});
document.addEventListener('click', () => $('userMenu').classList.remove('show'));
$('userMenu').addEventListener('click', () => $('userMenu').classList.remove('show'));

// Chuông thông báo
$('bellBtn').addEventListener('click', (e) => { e.stopPropagation(); $('bellMenu').classList.toggle('show'); $('userMenu').classList.remove('show'); });
$('bellMenu').addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('a')) $('bellMenu').classList.remove('show'); });
document.addEventListener('click', () => $('bellMenu').classList.remove('show'));

// Đổi mật khẩu
$('pwdBtn').addEventListener('click', (e) => {
  e.preventDefault();
  openPwd();
});

// Đăng xuất: xóa token rồi về trang đăng nhập
$('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  Auth.logout();
});

// Bấm menu bên trái -> đổi #hash -> hiện trang tương ứng (có thể F5 hoặc gửi link thẳng tới 1 mục)
window.addEventListener('hashchange', () => render(routeKey()));

// ----- Khởi động: xác định sinh viên đang đăng nhập rồi hiển thị trang -----
(async function init() {
  try {
    await resolveStudent();
  } catch (e) {
    $('content').innerHTML = `<div class="empty err">${ICON_ERR}<div>${esc(e.message)}</div></div>`;
    setWho(null);
    return;
  }
  await Promise.all([refreshWho(), render(current)]);
  if (current !== 'home' && current !== 'notices') loadNotices();
  setInterval(() => { if (!document.hidden) refreshBell(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshBell(); });
})();