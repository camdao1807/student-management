const API = '/advisor-assignments';
const LABEL = { active: 'Đang phụ trách', upcoming: 'Sắp bắt đầu', ended: 'Đã kết thúc' };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => (d ? d.split('-').reverse().join('/') : '');
const state = { page: 1, limit: 10, search: '', classId: '', status: '' };
let timer;

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Có lỗi xảy ra');
  return data;
}

async function loadStats() {
  const s = await api(`${API}/stats`);
  $('sTotal').textContent = s.total; $('sActive').textContent = s.active;
  $('sUpcoming').textContent = s.upcoming; $('sEnded').textContent = s.ended;
}

async function loadOptions() {
  const { employees, classes } = await api(`${API}/options`);
  $('fEmp').innerHTML = '<option value="">-- Chọn giảng viên --</option>' + employees.map((e) => `<option value="${e.id}">${esc(e.code)} - ${esc(e.name)}</option>`).join('');
  const opts = classes.map((c) => `<option value="${c.id}">${esc(c.code)} - ${esc(c.name)}</option>`).join('');
  $('fCls').innerHTML = '<option value="">-- Chọn lớp --</option>' + opts;
  $('fClass').innerHTML = '<option value="">Lớp: Tất cả</option>' + opts;
}

async function load() {
  const p = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => v !== '' && p.set(k, v));
  const { items, total } = await api(`${API}?${p}`);
  $('rows').innerHTML = items.length ? items.map((r) => `
    <tr><td><b>${esc(r.employeeCode)}</b></td>
    <td>${esc(r.employeeName)}<small>${esc(r.employeeEmail)}</small></td>
    <td>${esc(r.classCode)}<small>${esc(r.className)}</small></td>
    <td>${r.studentCount}</td>
    <td>${fmt(r.startDate)} → ${r.endDate ? fmt(r.endDate) : 'hiện tại'}</td>
    <td><span class="tag s-${r.status}">${LABEL[r.status]}</span></td>
    <td style="white-space:nowrap"><button class="sm" data-hist="${r.studentClassId}" data-name="${esc(r.classCode)}">Lịch sử</button>
    ${r.status !== 'ended' ? `<button class="sm" data-end="${r.id}">Kết thúc</button>` : ''}</td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Chưa có phân công nào khớp bộ lọc. Bấm “Thêm phân công” để tạo mới.</td></tr>';
  const pages = Math.max(1, Math.ceil(total / state.limit));
  $('info').textContent = `Hiển thị ${items.length} / ${total} phân công`;
  $('pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button class="sm ${i + 1 === state.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
}

const open = (id) => $(id).classList.add('show');
const closeAll = () => document.querySelectorAll('.overlay').forEach((m) => m.classList.remove('show'));

$('btnAdd').onclick = () => { $('eAdd').style.display = 'none'; $('fStart').value = new Date().toISOString().slice(0, 10); $('fEnd').value = ''; open('mAdd'); };
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeAll));
$('btnSave').onclick = async () => {
  try {
    await api(API, { method: 'POST', body: JSON.stringify({
      employeeId: +$('fEmp').value, studentClassId: +$('fCls').value,
      startDate: $('fStart').value, endDate: $('fEnd').value || null }) });
    closeAll(); await Promise.all([load(), loadStats()]);
  } catch (e) { $('eAdd').textContent = e.message; $('eAdd').style.display = 'block'; }
};

$('rows').onclick = async (e) => {
  const end = e.target.dataset.end, hist = e.target.dataset.hist;
  if (end && confirm('Kết thúc phân công này từ hôm nay? Lịch sử vẫn được giữ lại.')) {
    try { await api(`${API}/${end}/end`, { method: 'PATCH', body: '{}' }); await Promise.all([load(), loadStats()]); }
    catch (err) { alert(err.message); }
  }
  if (hist) {
    const rows = await api(`${API}/class/${hist}/history`);
    $('hTitle').textContent = `Lịch sử CVHT lớp ${e.target.dataset.name}`;
    $('hList').innerHTML = rows.map((r) => `<li><b>${esc(r.employeeName)}</b> (${esc(r.employeeCode)})<br>
      ${fmt(r.startDate)} → ${r.endDate ? fmt(r.endDate) : 'hiện tại'} <span class="tag s-${r.status}">${LABEL[r.status]}</span></li>`).join('') || '<li class="empty">Lớp chưa có CVHT</li>';
    open('mHist');
  }
};
$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load(); } };
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 300); };
$('fClass').onchange = (e) => { state.classId = e.target.value; state.page = 1; load(); };
$('fStatus').onchange = (e) => { state.status = e.target.value; state.page = 1; load(); };
document.querySelectorAll('.stat').forEach((c) => (c.onclick = () => { state.status = c.dataset.st; $('fStatus').value = c.dataset.st; state.page = 1; load(); }));
$('btnReset').onclick = () => { Object.assign(state, { page: 1, search: '', classId: '', status: '' }); $('q').value = ''; $('fClass').value = ''; $('fStatus').value = ''; load(); };

loadOptions(); loadStats(); load();