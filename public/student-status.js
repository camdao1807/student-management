const API = '/student-status';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => (d ? d.split('-').reverse().join('/') : '—');
const state = { page: 1, limit: 10, search: '', status: '', classId: '' };
let meta, label = {}, picked = null, current = null, timer, rows = [], loadSeq = 0, selectSeq = 0;
const checked = new Map(); // id -> { name, status }
Object.assign(state, { fromDate: '', toDate: '' });
const tag = (s) => s ? `<span class="tag s-${s}">${esc(label[s] || s)}</span>` : '—';

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Có lỗi xảy ra');
  return data;
}

function toast(message, ok = true) {
  const t = $('toast');
  t.textContent = message; t.className = ok ? 'show' : 'show error';
  clearTimeout(t.timer); t.timer = setTimeout(() => (t.className = ''), 4000);
}

async function init() {
  meta = await api(`${API}/meta`);
  meta.statuses.forEach((s) => (label[s.value] = s.label));
  $('fStatus').innerHTML += meta.statuses.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
  const classes = await api(`${API}/classes`);
  $('fClass').innerHTML += classes.map((c) => `<option value="${c.id}">${esc(c.code)}</option>`).join('');
  await Promise.all([loadStats(), load()]);
}

async function loadStats() {
  const s = await api(`${API}/stats`);
  $('cTotal').textContent = s.total;
  for (const key of ['Studying', 'Reserved', 'Dropped', 'Graduated']) {
    const n = s[key.toLowerCase()] || 0;
    $(`c${key}`).textContent = n;
    $(`p${key}`).textContent = `${s.total ? ((n / s.total) * 100).toFixed(1) : 0}%`;
  }
}

function query() {
  const p = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => v !== '' && p.set(k, v));
  return p;
}

async function load() {
  const seq = ++loadSeq;
  const { items, total } = await api(`${API}?${query()}`);
  if (seq !== loadSeq) return; // bỏ kết quả cũ trả về muộn
  rows = items;
  const pages = Math.max(1, Math.ceil(total / state.limit));
  if (state.page > pages) { state.page = pages; return load(); }
  renderRows();
  $('info').textContent = `Hiển thị ${items.length} / ${total} sinh viên`;
  $('pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button class="sm ${i + 1 === state.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
}

function renderRows() {
  $('rows').innerHTML = rows.length ? rows.map((r) => `
    <tr class="pick ${current === r.id ? 'sel' : ''}" data-id="${r.id}">
    <td><input type="checkbox" class="chk" aria-label="Chọn ${esc(r.studentCode)}" ${checked.has(r.id) ? 'checked' : ''}></td>
    <td><b>${esc(r.fullName)}</b><small>${esc(r.studentCode)}</small></td><td>${esc(r.classCode)}</td>
    <td>${r.previousStatus ? tag(r.previousStatus) + ' → ' : ''}${tag(r.status)}</td><td>${fmt(r.effectiveDate)}</td>
    <td><div class="reason" title="${esc(r.reason)}">${esc(r.reason || '—')}</div></td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">Không có sinh viên nào khớp bộ lọc.</td></tr>';
  $('chkAll').checked = rows.length > 0 && rows.every((r) => checked.has(r.id));
  $('btnClear').style.display = checked.size ? '' : 'none';
  $('btnClear').textContent = `Bỏ chọn (${checked.size})`;
}

const today = () => {
  const d = new Date(); // ngày theo giờ máy, không dùng giờ UTC
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function showForm(whoHtml, allowed, emptyText, minDate) {
  $('drawer').classList.add('open');
  $('who').innerHTML = whoHtml;
  $('picker').innerHTML = allowed.length
    ? allowed.map((s) => `<button type="button" data-s="${s}">${esc(label[s])}</button>`).join('')
    : `<div class="empty picker-empty">${emptyText}</div>`;
  picked = null; $('btnSave').disabled = true;
  $('fDate').min = minDate || '';
  $('fDate').value = minDate && minDate > today() ? minDate : today();
  $('fReason').value = ''; $('lblReason').textContent = 'Lý do'; $('err').style.display = 'none';
}

function resetForm() {
  selectSeq++; current = null; picked = null;
  $('drawer').classList.remove('open');
}

async function select(id) {
  const seq = ++selectSeq;
  current = id; picked = null; $('btnSave').disabled = true;
  const d = await api(`${API}/students/${id}/history`);
  if (seq !== selectSeq) return;
  showForm(
    `<b>${esc(d.student.fullName)}</b><br><small>${esc(d.student.studentCode)} • ${esc(d.student.classCode)}</small><div class="who-status">Hiện tại: ${tag(d.current)}</div>`,
    d.allowedNext, 'Đây là trạng thái cuối, không thể thay đổi.', d.history[0]?.effectiveDate);
  $('histBox').style.display = '';
  $('hist').innerHTML = d.history.map((h) => `<li>${tag(h.status)} <small class="inline">${fmt(h.effectiveDate)} • ${esc(h.createdBy || 'Không rõ người thực hiện')}</small>
    ${h.reason ? `<br><small>${esc(h.reason)}</small>` : ''}</li>`).join('') || '<li class="empty">Chưa có lịch sử</li>';
  renderRows();
}

/** Phiếu đổi hàng loạt: chỉ hiện trạng thái mà MỌI SV đã chọn đều chuyển được. */
function showBulk() {
  selectSeq++; current = null;
  const list = [...checked.values()];
  const allowedOf = (s) => (s.status ? meta.transitions[s.status] || [] : ['studying']);
  const allowed = meta.statuses.map((s) => s.value).filter((v) => list.every((st) => allowedOf(st).includes(v)));
  const minDate = list.map((s) => s.date || '').sort().pop();
  showForm(
    `<b>Đã chọn ${list.length} sinh viên</b><br><small>${list.map((s) => esc(s.name)).join(', ')}</small>`,
    allowed, 'Các sinh viên đã chọn không có trạng thái chuyển chung.', minDate);
  $('histBox').style.display = 'none';
}

function toggle(r, on) {
  if (on) checked.set(r.id, { name: r.fullName, status: r.status, date: r.effectiveDate });
  else checked.delete(r.id);
}

function afterCheck() {
  if (checked.size) showBulk(); else resetForm();
  renderRows();
}

function clearChecked() { checked.clear(); resetForm(); renderRows(); }

$('picker').onclick = (e) => {
  const s = e.target.dataset.s; if (!s) return;
  picked = s; $('btnSave').disabled = false;
  [...$('picker').children].forEach((b) => b.classList.toggle('on', b.dataset.s === s));
  $('lblReason').textContent = meta.reasonRequired.includes(s) ? 'Lý do điều chỉnh *' : 'Lý do (không bắt buộc)';
};

$('btnSave').onclick = async () => {
  const box = $('err'); box.className = 'err-box'; box.style.display = 'none';
  const fail = (m) => { box.textContent = m; box.style.display = 'block'; toast(m, false); };
  const bulk = checked.size > 0;
  const body = { status: picked, effectiveDate: $('fDate').value, reason: $('fReason').value.trim() };
  if (!picked) return;
  if (!body.effectiveDate) return fail('Vui lòng chọn ngày hiệu lực');
  if ($('fDate').min && body.effectiveDate < $('fDate').min) return fail(`Ngày hiệu lực không được trước ${fmt($('fDate').min)}`);
  if (meta.reasonRequired.includes(picked) && !body.reason) return fail('Vui lòng nhập lý do thay đổi trạng thái');
  if (['dropped', 'graduated'].includes(picked)) {
    const who = bulk ? `${checked.size} sinh viên` : 'sinh viên này';
    if (!confirm(`Chuyển ${who} sang "${label[picked]}"?\nĐây là trạng thái cuối, không thể hoàn tác.`)) return;
  }
  $('btnSave').disabled = true;
  try {
    if (bulk) {
      const { updated } = await api(`${API}/bulk-change`, { method: 'POST', body: JSON.stringify({ ...body, studentIds: [...checked.keys()] }) });
      clearChecked();
      await Promise.all([load(), loadStats()]);
      toast(`Đã cập nhật ${updated} sinh viên.`);
    } else {
      const id = current;
      await api(`${API}/students/${id}/change`, { method: 'POST', body: JSON.stringify(body) });
      await Promise.all([select(id), load(), loadStats()]);
      toast('Đã lưu thay đổi trạng thái.');
    }
  } catch (e) { fail(e.message); $('btnSave').disabled = !picked; }
};

$('rows').onclick = (e) => {
  const tr = e.target.closest('tr[data-id]'); if (!tr) return;
  const id = +tr.dataset.id;
  if (e.target.classList.contains('chk')) {
    toggle(rows.find((r) => r.id === id), e.target.checked);
    return afterCheck();
  }
  checked.clear();
  select(id).catch((err) => toast(err.message, false));
};
$('btnClose').onclick = () => { clearChecked(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearChecked(); });
$('chkAll').onchange = (e) => { rows.forEach((r) => toggle(r, e.target.checked)); afterCheck(); };
$('btnClear').onclick = clearChecked;
$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load().catch((err) => toast(err.message, false)); } };

// Đổi bộ lọc: về trang 1 và bỏ chọn để không sửa nhầm SV đang bị ẩn
function applyFilter(changes) {
  Object.assign(state, changes, { page: 1 });
  document.querySelectorAll('.kpi').forEach((c) => c.classList.toggle('on', c.dataset.st !== '' && c.dataset.st === state.status));
  if (checked.size) clearChecked();
  load().catch((err) => toast(err.message, false));
}
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => applyFilter({ search: e.target.value.trim() }), 300); };
$('fStatus').onchange = (e) => applyFilter({ status: e.target.value });
$('fClass').onchange = (e) => applyFilter({ classId: e.target.value });
$('fFrom').onchange = (e) => applyFilter({ fromDate: e.target.value });
$('fTo').onchange = (e) => applyFilter({ toDate: e.target.value });
document.querySelectorAll('.kpi').forEach((c) => (c.onclick = () => { $('fStatus').value = c.dataset.st; applyFilter({ status: c.dataset.st }); }));

$('btnExport').onclick = async () => {
  try {
    const res = await fetch(`${API}/export?${query()}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Không xuất được file');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = 'trang-thai-hoc-vu.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (e) { toast(e.message, false); }
};

init().catch((err) => toast(err.message, false));