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

const API = '/students';
const CLASSES_API = '/students/classes-options';

const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS = { studying: 'Đang học', reserved: 'Bảo lưu', dropped: 'Thôi học', graduated: 'Đã tốt nghiệp' };
const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2', '#475569', '#dc2626'];

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M3 7v6h6M3.5 13A9 9 0 1112 21"/></svg>',
};
const STAT_ICON = {
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M17 4a3.5 3.5 0 010 7M22 20c0-3-2-4.8-5-5.3"/></svg>',
  cap: '<svg viewBox="0 0 24 24"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>',
  userx: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5 2.2 0 4 .5 5.3 1.4M17 8l5 5M22 8l-5 5"/></svg>',
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toLocaleDateString('en-CA');
const day = (s) => (s ? String(s).slice(0, 10) : '');
const fmtDate = (s) => { const d = day(s); return d ? d.split('-').reverse().join('/') : ''; };

let state = { page: 1, limit: 10, totalPages: 1, total: 0 };
let rows = [];
let classes = [];
let editingId = null;
const selected = new Set();    // id đang được tick

/* ---------- Gọi API ---------- */
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = data && data.message ? (Array.isArray(data.message) ? data.message.join('\n') : data.message) : `Lỗi ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return data;
}

function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = ok ? 'var(--ok)' : 'var(--err)';
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.style.display = 'none'), 3500);
}

const colorOf = (s) => COLORS[[...String(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initial = (name) => (String(name || '?').trim().split(/\s+/).pop().charAt(0) || '?').toUpperCase();

/* ---------- Thống kê ---------- */
async function loadStats() {
  try {
    const s = await api(`${API}/stats`);
    const pct = (n) => (s.total ? ((n / s.total) * 100).toFixed(1) : '0.0');
    const card = (cls, label, num, ico, foot) => `
      <div class="stat ${cls}">
        <div class="stat-top">
          <div><div class="stat-label">${label}</div><div class="stat-num">${num.toLocaleString('vi-VN')}</div></div>
          <div class="stat-ico">${STAT_ICON[ico]}</div>
        </div>
        <div class="stat-foot">${foot}</div>
      </div>`;
    $('stats').innerHTML =
      card('', 'Tổng số sinh viên', s.total, 'users', '<span>Toàn trường</span>') +
      card('s-ok', 'Đang học bình thường', s.studying, 'cap', `<span>Tỷ lệ</span><b>${pct(s.studying)}%</b>`) +
      card('s-warn', 'Đang bảo lưu hồ sơ', s.reserved, 'pause', `<span>Tỷ lệ</span><b>${pct(s.reserved)}%</b>`) +
      card('s-err', 'Đã thôi học', s.dropped, 'userx', `<span>Tỷ lệ</span><b>${pct(s.dropped)}%</b>`) +
      card('s-gray', 'Đã tốt nghiệp', s.graduated, 'medal', `<span>Tỷ lệ</span><b>${pct(s.graduated)}%</b>`);
  } catch (_) { $('stats').innerHTML = ''; }
}

/* ---------- Lớp học ---------- */
async function loadClasses() {
  try {
    const res = await api(CLASSES_API);
    classes = Array.isArray(res) ? res : (res.data || []);
  } catch (_) { classes = []; }
  renderClassControls();
}

function renderClassControls() {
  if (classes.length) {
    const opts = classes.map((c) => `<option value="${esc(c.id)}">${esc(c.classCode)} - ${esc(c.className)}</option>`).join('');
    $('classFilterBox').innerHTML = `<select id="fClass" style="width:100%"><option value="">Lớp: Tất cả lớp</option>${opts}</select>`;
    $('classFormBox').innerHTML = `<select id="classId" required style="width:100%"><option value="">-- Chọn lớp --</option>${opts}</select>`;

    const years = [...new Set(classes.map((c) => c.academicYear).filter(Boolean))].sort();
    $('fYear').innerHTML = `<option value="">Khóa: Tất cả khóa</option>` +
      years.map((y) => `<option value="${esc(y)}">${esc(y)}</option>`).join('');
  } else {
    $('classFilterBox').innerHTML = `<input id="fClass" type="number" min="1" placeholder="ID lớp" style="width:100%">`;
    $('classFormBox').innerHTML = `<input id="classId" type="number" min="1" placeholder="Nhập ID lớp (VD: 1)" required style="width:100%">`;
  }
  $('fClass').addEventListener('input', () => { state.page = 1; load(); });
}

/* ---------- Danh sách ---------- */
function filters() {
  return {
    q: $('q').value.trim(),
    classId: $('fClass').value,
    status: $('fStatus').value,
    academicYear: $('fYear').value,
    gender: $('fGender').value,
    archived: $('fArchived').value === 'true',
  };
}

async function load() {
  const f = filters();
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.classId) p.set('classId', f.classId);
  if (f.gender) p.set('gender', f.gender);
  if (f.status) p.set('status', f.status);
  if (f.academicYear) p.set('academicYear', f.academicYear);
  if (f.archived) p.set('archived', 'true');
  p.set('page', state.page);
  p.set('limit', state.limit);

  renderChips();
  try {
    const res = await api(`${API}?${p}`);
    rows = res.data;
    Object.assign(state, { total: res.meta.total, totalPages: res.meta.totalPages || 1 });
    renderTable();
  } catch (e) { toast(e.message, false); }
}

function badge(status) {
  return status
    ? `<span class="badge b-${esc(status)}">${esc(STATUS[status] || status)}</span>`
    : `<span class="badge b-none">Chưa có</span>`;
}

function ibtn(icon, title, fn, id, danger = false) {
  return `<button class="ibtn${danger ? ' danger' : ''}" title="${title}" onclick="${fn}('${id}')">${ICON[icon]}</button>`;
}

function renderTable() {
  const archived = $('fArchived').value === 'true';
  const startNo = (state.page - 1) * state.limit;

  $('tbody').innerHTML = rows.map((s, i) => {
    const c = s.studentClass;
    return `
    <tr>
      <td><input type="checkbox" class="rowchk" data-id="${s.id}" ${selected.has(s.id) ? 'checked' : ''}></td>
      <td>${String(startNo + i + 1).padStart(2, '0')}</td>
      <td><span class="code">${esc(s.studentCode)}</span></td>
      <td>
        <div class="person">
          <div class="p-avatar" style="background:${colorOf(s.studentCode)}">${esc(initial(s.fullName))}</div>
          <div><div class="p-name">${esc(s.fullName)}</div><div class="p-mail">${esc(s.email)}</div></div>
        </div>
      </td>
      <td class="dob">${fmtDate(s.dateOfBirth)}<small>${esc(GENDER[s.gender] || '')}</small></td>
      <td>${esc(s.phone || '')}</td>
      <td>${c ? `<span class="class-chip">${esc(c.classCode)}</span>` : esc(s.classId)}</td>
      <td class="major">${c ? esc(c.majorName) : ''}<small>${c ? 'Khóa ' + esc(c.academicYear) : ''}</small></td>
      <td>${badge(s.currentStatus)}</td>
      <td class="center"><div class="actions">
        ${ibtn('eye', 'Xem chi tiết', 'openDetail', s.id)}
        ${archived
          ? ibtn('undo', 'Khôi phục', 'restoreStudent', s.id)
          : ibtn('edit', 'Sửa hồ sơ', 'openEdit', s.id)
            + ibtn('box', 'Lưu trữ', 'archiveStudent', s.id, true)}
      </div></td>
    </tr>`;
  }).join('');

  $('empty').style.display = rows.length ? 'none' : 'block';
  const from = rows.length ? startNo + 1 : 0;
  $('info').textContent = `Hiển thị ${from} - ${startNo + rows.length} trong tổng số ${state.total} sinh viên`;
  renderPager();
  syncSelection();

  document.querySelectorAll('.rowchk').forEach((chk) =>
    chk.addEventListener('change', () => {
      chk.checked ? selected.add(chk.dataset.id) : selected.delete(chk.dataset.id);
      syncSelection();
    }));
}

function renderPager() {
  const box = $('pg');
  const tp = state.totalPages;
  if (tp <= 1) { box.innerHTML = ''; return; }
  const b = (label, page, dis = false, on = false) =>
    `<button class="${on ? 'on' : ''}" ${dis ? 'disabled' : ''} data-page="${page}">${label}</button>`;
  let html = b('‹', state.page - 1, state.page === 1);
  const from = Math.max(1, state.page - 2), to = Math.min(tp, state.page + 2);
  for (let i = from; i <= to; i++) html += b(i, i, false, i === state.page);
  html += b('›', state.page + 1, state.page === tp);
  box.innerHTML = html;
  box.querySelectorAll('button[data-page]').forEach((btn) =>
    btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); load(); }));
}

/* ---------- Chọn nhiều ---------- */
function syncSelection() {
  $('selCount').textContent = `Đã chọn ${selected.size} sinh viên`;
  const chks = [...document.querySelectorAll('.rowchk')];
  $('chkAll').checked = chks.length > 0 && chks.every((c) => c.checked);
}

$('chkAll').addEventListener('change', (e) => {
  document.querySelectorAll('.rowchk').forEach((c) => {
    c.checked = e.target.checked;
    e.target.checked ? selected.add(c.dataset.id) : selected.delete(c.dataset.id);
  });
  syncSelection();
});

/* ---------- Chip bộ lọc đang áp dụng ---------- */
function renderChips() {
  const f = filters();
  const items = [];
  if (f.q) items.push(['q', `Từ khóa: ${f.q}`]);
  if (f.classId) {
    const c = classes.find((x) => String(x.id) === String(f.classId));
    items.push(['class', `Lớp: ${c ? c.classCode : f.classId}`]);
  }
  if (f.status) items.push(['status', `Trạng thái: ${STATUS[f.status]}`]);
  if (f.academicYear) items.push(['year', `Khóa: ${f.academicYear}`]);
  if (f.gender) items.push(['gender', `Giới tính: ${GENDER[f.gender]}`]);

  if (!items.length) { $('chips').innerHTML = ''; return; }
  $('chips').innerHTML = `Bộ lọc đang áp dụng: ` +
    items.map(([k, t]) => `<span class="chip">${esc(t)} <button data-clear="${k}">×</button></span>`).join('') +
    `<button class="clear-all" id="clearAll">Xóa tất cả (${items.length})</button>`;

  $('chips').querySelectorAll('[data-clear]').forEach((b) =>
    b.addEventListener('click', () => clearFilter(b.dataset.clear)));
  $('clearAll').addEventListener('click', resetFilters);
}

function clearFilter(key) {
  const map = { q: 'q', class: 'fClass', status: 'fStatus', year: 'fYear', gender: 'fGender' };
  $(map[key]).value = '';
  state.page = 1;
  load();
}

function resetFilters() {
  ['q', 'fClass', 'fStatus', 'fYear', 'fGender'].forEach((id) => ($(id).value = ''));
  state.page = 1;
  load();
}

/* ---------- Modal ---------- */
const open = (id) => $(id).classList.add('show');
const close = (id) => $(id).classList.remove('show');
document.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => b.closest('.overlay').classList.remove('show')));

/* ---------- Thêm / sửa ---------- */
function setHint(text, cls) { $('codeHint').textContent = text; $('codeHint').className = 'hint ' + (cls || ''); }

$('btnAdd').addEventListener('click', () => {
  editingId = null;
  $('formTitle').textContent = 'Thêm sinh viên';
  $('form').reset();
  setHint('');
  open('mForm');
});

window.openEdit = (id) => {
  const s = rows.find((r) => r.id === id);
  if (!s) return;
  editingId = id;
  $('formTitle').textContent = 'Cập nhật hồ sơ';
  $('studentCode').value = s.studentCode;
  $('fullName').value = s.fullName;
  $('dateOfBirth').value = day(s.dateOfBirth);
  $('gender').value = s.gender || '';
  $('email').value = s.email;
  $('phone').value = s.phone || '';
  $('hometown').value = s.hometown || '';
  $('classId').value = s.classId;
  setHint('');
  open('mForm');
};

$('studentCode').addEventListener('blur', async () => {
  const code = $('studentCode').value.trim();
  if (!code) return setHint('');
  try {
    const p = new URLSearchParams({ code });
    if (editingId) p.set('excludeId', editingId);
    const r = await api(`${API}/check-code?${p}`);
    r.available ? setHint('Mã này có thể sử dụng', 'ok') : setHint('Mã sinh viên đã tồn tại (có thể ở hồ sơ lưu trữ)', 'err');
  } catch (_) { setHint(''); }
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    studentCode: $('studentCode').value.trim(),
    fullName: $('fullName').value.trim(),
    dateOfBirth: $('dateOfBirth').value,
    gender: $('gender').value,
    email: $('email').value.trim(),
    phone: $('phone').value.trim(),
    hometown: $('hometown').value.trim(),
    classId: String($('classId').value),
  };
  if (!body.gender) delete body.gender;
  if (!body.phone) delete body.phone;

  if (!body.studentCode || !body.fullName || !body.dateOfBirth || !body.email || !body.classId) {
    return toast('Vui lòng nhập đủ các trường có dấu *', false);
  }
  if (body.dateOfBirth > today()) return toast('Ngày sinh không được nằm trong tương lai', false);

  $('btnSave').disabled = true;
  try {
    if (editingId) {
      await api(`${API}/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Đã cập nhật hồ sơ');
    } else {
      await api(API, { method: 'POST', body: JSON.stringify(body) });
      toast('Đã thêm sinh viên');
    }
    close('mForm');
    load(); loadStats();
  } catch (err) { toast(err.message, false); }
  finally { $('btnSave').disabled = false; }
});

/* ---------- Chi tiết + lịch sử trạng thái ---------- */
window.openDetail = async (id) => {
  const archived = $('fArchived').value === 'true';
  try {
    const s = archived ? rows.find((r) => r.id === id) : await api(`${API}/${id}`);
    const history = await api(`${API}/${id}/status-history`);
    const c = s.studentClass;

    const item = (label, value, full = false) =>
      `<div class="d-item${full ? ' full' : ''}"><span>${label}</span><b>${value || '—'}</b></div>`;

    $('detailBody').innerHTML = `
      <div class="d-hero">
        <div class="p-avatar d-avatar" style="background:${colorOf(s.studentCode)}">${esc(initial(s.fullName))}</div>
        <div>
          <div class="d-name">${esc(s.fullName)}</div>
          <div class="d-sub"><span class="code">${esc(s.studentCode)}</span>${badge(s.currentStatus)}</div>
        </div>
      </div>

      <div class="d-section">Thông tin cá nhân</div>
      <div class="d-grid">
        ${item('Ngày sinh', fmtDate(s.dateOfBirth))}
        ${item('Giới tính', esc(GENDER[s.gender] || ''))}
        ${item('Email', esc(s.email))}
        ${item('Số điện thoại', esc(s.phone || ''))}
        ${item('Quê quán', esc(s.hometown || ''), true)}
      </div>

      <div class="d-section">Thông tin học tập</div>
      <div class="d-grid">
        ${item('Lớp hành chính', c ? esc(c.classCode + ' - ' + c.className) : esc(s.classId), true)}
        ${item('Ngành', c ? esc(c.majorName) : '')}
        ${item('Khóa', c ? esc(c.academicYear) : '')}
        ${item('Ngày tạo hồ sơ', fmtDate(s.createdAt))}
      </div>

      <div class="d-section">Lịch sử trạng thái</div>
      <div class="timeline">
        ${history.length ? history.map((h) => `
          <div class="tl-item">
            <span class="tl-dot"></span>
            <div class="tl-body">
              <div>${badge(h.status)} <span class="tl-date">từ ${fmtDate(h.effectiveDate)}</span></div>
              ${h.reason ? `<div class="tl-reason">${esc(h.reason)}</div>` : ''}
            </div>
          </div>`).join('') : '<div class="tl-empty">Chưa có lịch sử.</div>'}
      </div>`;
    open('mDetail');
  } catch (err) { toast(err.message, false); }
};

/* ---------- Lưu trữ / khôi phục ---------- */
window.archiveStudent = async (id) => {
  if (!confirm('Lưu trữ hồ sơ này? Dữ liệu lịch sử vẫn được giữ nguyên và có thể khôi phục.')) return;
  try { await api(`${API}/${id}/archive`, { method: 'PATCH' }); toast('Đã lưu trữ hồ sơ'); selected.delete(id); load(); loadStats(); }
  catch (err) { toast(err.message, false); }
};

window.restoreStudent = async (id) => {
  try { await api(`${API}/${id}/restore`, { method: 'PATCH' }); toast('Đã khôi phục hồ sơ'); load(); loadStats(); }
  catch (err) { toast(err.message, false); }
};

/* ---------- Sự kiện lọc ---------- */
$('btnReset').addEventListener('click', resetFilters);
let timer;
$('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.page = 1; load(); }, 350); });
['fStatus', 'fYear', 'fGender', 'fArchived'].forEach((id) =>
  $(id).addEventListener('change', () => { state.page = 1; selected.clear(); load(); }));

loadClasses().then(() => { load(); loadStats(); });