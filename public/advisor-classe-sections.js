const API = '/advisor-assignments';
const LABEL = { active: 'Đang phụ trách', upcoming: 'Sắp bắt đầu', ended: 'Đã kết thúc' };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => (d ? d.split('-').reverse().join('/') : '');
const state = { page: 1, limit: 10, search: '', classId: '', status: '' };
let timer, last = [];
const COLORS = [['#fef3c7', '#b45309'], ['#dbeafe', '#1d4ed8'], ['#dcfce7', '#15803d'], ['#fce7f3', '#be185d'], ['#ede9fe', '#6d28d9']];
const ini = (n) => { const w = String(n).trim().split(/\s+/); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Có lỗi xảy ra');
  return data;
}

async function loadStats() {
  const s = await api(`${API}/stats`);
  const pct = (n) => (s.total ? Math.round((n / s.total) * 1000) / 10 : 0);
  [['Total', s.total, 100], ['Active', s.active, pct(s.active)], ['Upcoming', s.upcoming, pct(s.upcoming)], ['Ended', s.ended, pct(s.ended)]].forEach(([k, n, p]) => {
    $('s' + k).textContent = n; $('b' + k).style.width = p + '%';
    if (k !== 'Total') $('s' + k + 'Sub').innerHTML = `<b>${p}%</b> Tỷ lệ trên tổng`;
  });
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
  last = items; const off = (state.page - 1) * state.limit;
  $('rows').innerHTML = items.length ? items.map((r, i) => {
    const [bg, fg] = COLORS[[...r.employeeCode].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
    return `<tr><td>${String(off + i + 1).padStart(2, '0')}</td>
    <td><span class="av-code">${esc(r.employeeCode)}</span></td>
    <td><div class="av-who"><span class="av-ava" style="background:${bg};color:${fg}">${esc(ini(r.employeeName))}</span><div><b>${esc(r.employeeName)}</b><small>${esc(r.employeeEmail)}</small></div></div></td>
    <td><span class="av-code">${esc(r.classCode)}</span><small>${esc(r.className)}</small></td>
    <td>${r.studentCount} SV</td>
    <td>${fmt(r.startDate)}<small>→ ${r.endDate ? fmt(r.endDate) : 'hiện tại'}</small></td>
    <td><span class="av-st s-${r.status}">${LABEL[r.status]}</span></td>
    <td class="av-act"><button class="sm" data-hist="${r.studentClassId}" data-name="${esc(r.classCode)}">Lịch sử</button>
    ${r.status !== 'ended' ? `<button class="sm" data-end="${r.id}">Kết thúc</button>` : ''}</td></tr>`;
  }).join('')
    : '<tr><td colspan="8" class="empty">Chưa có phân công nào khớp bộ lọc. Bấm “Thêm phân công” để tạo mới.</td></tr>';
  const pages = Math.max(1, Math.ceil(total / state.limit));
  $('info').innerHTML = `Hiển thị <b>${items.length}</b> / <b>${total}</b> phân công`;
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
  const btn = e.target.closest('button'); if (!btn) return;
  const end = btn.dataset.end, hist = btn.dataset.hist;
  if (end && confirm('Kết thúc phân công này từ hôm nay? Lịch sử vẫn được giữ lại.')) {
    try { await api(`${API}/${end}/end`, { method: 'PATCH', body: '{}' }); await Promise.all([load(), loadStats()]); }
    catch (err) { alert(err.message); }
  }
  if (hist) {
    const rows = await api(`${API}/class/${hist}/history`);
    $('hTitle').textContent = `Lịch sử CVHT lớp ${btn.dataset.name}`;
    $('hList').innerHTML = rows.map((r) => `<li><b>${esc(r.employeeName)}</b> (${esc(r.employeeCode)})<br>
      ${fmt(r.startDate)} → ${r.endDate ? fmt(r.endDate) : 'hiện tại'} <span class="tag s-${r.status}">${LABEL[r.status]}</span></li>`).join('') || '<li class="empty">Lớp chưa có CVHT</li>';
    open('mHist');
  }
};
$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load(); } };
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 300); };
$('fClass').onchange = (e) => { state.classId = e.target.value; state.page = 1; load(); };
$('fStatus').onchange = (e) => { state.status = e.target.value; state.page = 1; load(); };
document.querySelectorAll('.av-card[data-st]').forEach((c) => (c.onclick = () => { state.status = c.dataset.st; $('fStatus').value = c.dataset.st; state.page = 1; load(); }));
$('btnReset').onclick = () => { Object.assign(state, { page: 1, search: '', classId: '', status: '' }); $('q').value = ''; $('fClass').value = ''; $('fStatus').value = ''; load(); };

$('btnExport').onclick = () => {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Mã GV', 'Giảng viên', 'Email', 'Lớp', 'Sĩ số', 'Bắt đầu', 'Kết thúc', 'Trạng thái'],
    ...last.map((r) => [r.employeeCode, r.employeeName, r.employeeEmail, r.classCode, r.studentCount, r.startDate, r.endDate || '', LABEL[r.status]])];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = 'phan-cong-cvht.csv'; a.click();
};

loadOptions(); loadStats(); load();