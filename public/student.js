const API = '/students';
const CLASSES_API = '/students/classes-options';

const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS = { studying: 'Đang học', reserved: 'Bảo lưu', dropped: 'Thôi học', graduated: 'Đã tốt nghiệp' };
const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2', '#475569', '#dc2626'];

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M3 7v6h6M3.5 13A9 9 0 1112 21"/></svg>',
};
const STAT_ICON = {
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M17 4a3.5 3.5 0 010 7M22 20c0-3-2-4.8-5-5.3"/></svg>',
  cap: '<svg viewBox="0 0 24 24"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>',
  medal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>',
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
let statusIds = [];            // danh sách id đang đổi trạng thái
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
            + ibtn('swap', 'Đổi trạng thái', 'openStatus', s.id)
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
  $('btnBulkStatus').disabled = selected.size === 0 || $('fArchived').value === 'true';
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
    $('detailBody').innerHTML = `
      <dl>
        <dt>Mã sinh viên</dt><dd><b>${esc(s.studentCode)}</b></dd>
        <dt>Họ tên</dt><dd>${esc(s.fullName)}</dd>
        <dt>Ngày sinh</dt><dd>${fmtDate(s.dateOfBirth)}</dd>
        <dt>Giới tính</dt><dd>${esc(GENDER[s.gender] || '')}</dd>
        <dt>Email</dt><dd>${esc(s.email)}</dd>
        <dt>Số điện thoại</dt><dd>${esc(s.phone || '')}</dd>
        <dt>Lớp</dt><dd>${c ? esc(c.classCode + ' - ' + c.className) : esc(s.classId)}</dd>
        <dt>Ngành / Khóa</dt><dd>${c ? esc(c.majorName + ' · ' + c.academicYear) : ''}</dd>
        <dt>Trạng thái hiện tại</dt><dd>${badge(s.currentStatus)}</dd>
        <dt>Ngày tạo</dt><dd>${fmtDate(s.createdAt)}</dd>
      </dl>
      <h3 class="sub">Lịch sử trạng thái</h3>
      <div class="hist">
        ${history.length ? history.map((h) => `
          <div>${badge(h.status)} <span style="color:var(--mut)">từ ${fmtDate(h.effectiveDate)}</span>
          ${h.reason ? `<br>${esc(h.reason)}` : ''}</div>`).join('') : 'Chưa có lịch sử.'}
      </div>`;
    open('mDetail');
  } catch (err) { toast(err.message, false); }
};

/* ---------- Đổi trạng thái (1 hoặc nhiều) ---------- */
function openStatusFor(ids, label) {
  statusIds = ids;
  $('stName').textContent = label;
  $('stValue').value = 'studying';
  $('stDate').value = today();
  $('stReason').value = '';
  open('mStatus');
}

window.openStatus = (id) => {
  const s = rows.find((r) => r.id === id);
  openStatusFor([id], `${s.studentCode} - ${s.fullName}`);
  $('stValue').value = s.currentStatus || 'studying';
};

$('btnBulkStatus').addEventListener('click', () =>
  openStatusFor([...selected], `${selected.size} sinh viên đã chọn`));

$('statusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { status: $('stValue').value, effectiveDate: $('stDate').value };
  const reason = $('stReason').value.trim();
  if (reason) body.reason = reason;
  try {
    for (const id of statusIds) {
      await api(`${API}/${id}/status`, { method: 'POST', body: JSON.stringify(body) });
    }
    toast(`Đã cập nhật trạng thái cho ${statusIds.length} sinh viên`);
    close('mStatus');
    selected.clear();
    load(); loadStats();
  } catch (err) { toast(err.message, false); }
});

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