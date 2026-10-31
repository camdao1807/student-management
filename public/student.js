const API = '/students';
const CLASSES_API = '/students/classes-options'; // Endpoint chỉ-đọc nằm trong module students. Khi module lớp học xong có thể đổi về '/student-classes'.

const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS = { studying: 'Đang học', reserved: 'Bảo lưu', dropped: 'Thôi học', graduated: 'Đã tốt nghiệp' };

const ICON = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M3 7v6h6M3.5 13A9 9 0 1112 21"/></svg>',
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const today = () => new Date().toLocaleDateString('en-CA');
const day = (s) => (s ? String(s).slice(0, 10) : '');
const fmtDate = (s) => { const d = day(s); return d ? d.split('-').reverse().join('/') : ''; };

let state = { page: 1, limit: 10, totalPages: 1, total: 0 };
let rows = [];
let editingId = null;
let statusId = null;
let classes = [];

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

/* ---------- Lớp học ---------- */
async function loadClasses() {
  try {
    const res = await api(CLASSES_API);
    const list = Array.isArray(res) ? res : res.data;
    if (!Array.isArray(list)) throw new Error('bad');
    classes = list;
  } catch (_) { classes = []; }
  renderClassControls();
}

function renderClassControls() {
  if (classes.length) {
    const opts = classes.map((c) =>
      `<option value="${esc(c.id)}">${esc(c.classCode)} - ${esc(c.className)}${c.majorName ? ' (' + esc(c.majorName) + ')' : ''}</option>`).join('');
    $('classFilterBox').innerHTML = `<select id="fClass"><option value="">Tất cả</option>${opts}</select>`;
    $('classFormBox').innerHTML = `<select id="classId" required style="width:100%"><option value="">-- Chọn lớp --</option>${opts}</select>`;
  } else {
    $('classFilterBox').innerHTML = `<input id="fClass" type="number" min="1" placeholder="ID lớp" style="width:100px">`;
    $('classFormBox').innerHTML = `<input id="classId" type="number" min="1" placeholder="Nhập ID lớp (VD: 1)" required style="width:100%">`;
  }
  $('fClass').addEventListener('input', () => { state.page = 1; load(); });
}

/* ---------- Danh sách ---------- */
function hasFilter() {
  return !!($('fClass').value || $('fGender').value || $('fStatus').value || $('fArchived').value === 'true');
}

async function load() {
  const p = new URLSearchParams();
  const q = $('q').value.trim();
  if (q) p.set('q', q);
  if ($('fClass').value) p.set('classId', $('fClass').value);
  if ($('fGender').value) p.set('gender', $('fGender').value);
  if ($('fStatus').value) p.set('status', $('fStatus').value);
  if ($('fArchived').value === 'true') p.set('archived', 'true');
  p.set('page', state.page);
  p.set('limit', state.limit);

  $('btnFilter').classList.toggle('active', hasFilter());

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
  $('tbody').innerHTML = rows.map((s) => `
    <tr class="${s.currentStatus === 'dropped' ? 'is-dropped' : ''}">
      <td>
        <div class="name">${esc(s.fullName)}</div>
        <div class="sub">${esc(s.studentCode)}</div>
      </td>
      <td>${esc(s.studentClass ? s.studentClass.classCode : s.classId)}</td>
      <td>${esc(GENDER[s.gender] || '')}</td>
      <td>${fmtDate(s.dateOfBirth)}</td>
      <td>${badge(s.currentStatus)}</td>
      <td class="center"><div class="actions">
        ${ibtn('eye', 'Xem chi tiết', 'openDetail', s.id)}
        ${archived
          ? ibtn('undo', 'Khôi phục', 'restoreStudent', s.id)
          : ibtn('edit', 'Sửa hồ sơ', 'openEdit', s.id)
            + ibtn('swap', 'Đổi trạng thái', 'openStatus', s.id)
            + ibtn('box', 'Lưu trữ', 'archiveStudent', s.id, true)}
      </div></td>
    </tr>`).join('');

  $('empty').style.display = rows.length ? 'none' : 'block';
  $('info').textContent = `Tổng: ${state.total} sinh viên`;
  $('pageNo').textContent = `Trang ${state.page} / ${state.totalPages}`;
  $('prev').disabled = state.page <= 1;
  $('next').disabled = state.page >= state.totalPages;
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

// Kiểm tra mã sinh viên không trùng khi rời khỏi ô nhập
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
    load();
  } catch (err) { toast(err.message, false); }
  finally { $('btnSave').disabled = false; }
});

/* ---------- Chi tiết + lịch sử trạng thái ---------- */
window.openDetail = async (id) => {
  const archived = $('fArchived').value === 'true';
  try {
    const s = archived ? rows.find((r) => r.id === id) : await api(`${API}/${id}`);
    const history = await api(`${API}/${id}/status-history`);
    $('detailBody').innerHTML = `
      <dl>
        <dt>Mã sinh viên</dt><dd><b>${esc(s.studentCode)}</b></dd>
        <dt>Họ tên</dt><dd>${esc(s.fullName)}</dd>
        <dt>Ngày sinh</dt><dd>${fmtDate(s.dateOfBirth)}</dd>
        <dt>Giới tính</dt><dd>${esc(GENDER[s.gender] || '')}</dd>
        <dt>Email</dt><dd>${esc(s.email)}</dd>
        <dt>Số điện thoại</dt><dd>${esc(s.phone || '')}</dd>
        <dt>Lớp</dt><dd>${s.studentClass ? esc(s.studentClass.classCode + ' - ' + s.studentClass.className) : esc(s.classId)}</dd>
        <dt>Trạng thái hiện tại</dt><dd>${badge(s.currentStatus)}</dd>
        <dt>Ngày tạo</dt><dd>${fmtDate(s.createdAt)}</dd>
      </dl>
      <h3>Lịch sử trạng thái</h3>
      <div class="hist">
        ${history.length ? history.map((h) => `
          <div>${badge(h.status)} <span style="color:var(--mut)">từ ${fmtDate(h.effectiveDate)}</span>
          ${h.reason ? `<br>${esc(h.reason)}` : ''}</div>`).join('') : 'Chưa có lịch sử.'}
      </div>`;
    open('mDetail');
  } catch (err) { toast(err.message, false); }
};

/* ---------- Đổi trạng thái ---------- */
window.openStatus = (id) => {
  const s = rows.find((r) => r.id === id);
  statusId = id;
  $('stName').textContent = `${s.studentCode} - ${s.fullName}`;
  $('stValue').value = s.currentStatus || 'studying';
  $('stDate').value = today();
  $('stReason').value = '';
  open('mStatus');
};

$('statusForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { status: $('stValue').value, effectiveDate: $('stDate').value };
  const reason = $('stReason').value.trim();
  if (reason) body.reason = reason;
  try {
    await api(`${API}/${statusId}/status`, { method: 'POST', body: JSON.stringify(body) });
    toast('Đã cập nhật trạng thái');
    close('mStatus');
    load();
  } catch (err) { toast(err.message, false); }
});

/* ---------- Lưu trữ / khôi phục ---------- */
window.archiveStudent = async (id) => {
  if (!confirm('Lưu trữ hồ sơ này? Dữ liệu lịch sử vẫn được giữ nguyên và có thể khôi phục.')) return;
  try { await api(`${API}/${id}/archive`, { method: 'PATCH' }); toast('Đã lưu trữ hồ sơ'); load(); }
  catch (err) { toast(err.message, false); }
};

window.restoreStudent = async (id) => {
  try { await api(`${API}/${id}/restore`, { method: 'PATCH' }); toast('Đã khôi phục hồ sơ'); load(); }
  catch (err) { toast(err.message, false); }
};

/* ---------- Bộ lọc / phân trang ---------- */
$('btnFilter').addEventListener('click', () => $('filterPanel').classList.toggle('show'));

$('btnClear').addEventListener('click', () => {
  $('fClass').value = '';
  $('fGender').value = '';
  $('fStatus').value = '';
  $('fArchived').value = 'false';
  state.page = 1;
  load();
});

let timer;
$('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.page = 1; load(); }, 350); });
['fGender', 'fStatus', 'fArchived'].forEach((id) => $(id).addEventListener('change', () => { state.page = 1; load(); }));
$('prev').addEventListener('click', () => { if (state.page > 1) { state.page--; load(); } });
$('next').addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; load(); } });

loadClasses().then(load);