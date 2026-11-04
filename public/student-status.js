const API = '/student-status';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => (d ? d.split('-').reverse().join('/') : '—');
const state = { page: 1, limit: 10, search: '', status: '', classId: '' };
let meta, label = {}, picked = null, current = null, timer;
const tag = (s) => s ? `<span class="tag s-${s}">${esc(label[s] || s)}</span>` : '—';

async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Có lỗi xảy ra');
  return data;
}

async function init() {
  meta = await api(`${API}/meta`);
  meta.statuses.forEach((s) => (label[s.value] = s.label));
  $('fStatus').innerHTML += meta.statuses.map((s) => `<option value="${s.value}">${s.label}</option>`).join('');
  const classes = await api(`${API}/classes`);
  $('fClass').innerHTML += classes.map((c) => `<option value="${c.id}">${esc(c.code)}</option>`).join('');
  loadStats(); load();
}

async function loadStats() {
  const s = await api(`${API}/stats`);
  $('cStudying').textContent = s.studying; $('cSuspended').textContent = s.suspended;
  $('cDropped').textContent = s.dropped; $('cGraduated').textContent = s.graduated;
}

async function load() {
  const p = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => v !== '' && p.set(k, v));
  const { items, total } = await api(`${API}?${p}`);
  $('rows').innerHTML = items.length ? items.map((r) => `
    <tr class="pick ${current === r.id ? 'sel' : ''}" data-id="${r.id}">
    <td><b>${esc(r.fullName)}</b><small>${esc(r.studentCode)}</small></td><td>${esc(r.classCode)}</td>
    <td>${r.previousStatus ? tag(r.previousStatus) + ' → ' : ''}${tag(r.status)}</td><td>${fmt(r.effectiveDate)}</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty">Không có sinh viên nào khớp bộ lọc.</td></tr>';
  const pages = Math.max(1, Math.ceil(total / state.limit));
  $('info').textContent = `Hiển thị ${items.length} / ${total} sinh viên`;
  $('pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button class="sm ${i + 1 === state.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
}

async function select(id) {
  current = id;
  const d = await api(`${API}/students/${id}/history`);
  $('noSel').style.display = 'none'; $('form').style.display = 'block';
  $('who').innerHTML = `<b>${esc(d.student.fullName)}</b><br><small>${esc(d.student.studentCode)} • ${esc(d.student.classCode)}</small><div style="margin-top:6px">Hiện tại: ${tag(d.current)}</div>`;
  $('picker').innerHTML = d.allowedNext.length
    ? d.allowedNext.map((s) => `<button data-s="${s}">${esc(label[s])}</button>`).join('')
    : '<div class="empty" style="grid-column:1/3">Đây là trạng thái cuối, không thể thay đổi.</div>';
  picked = null; $('btnSave').disabled = true;
  $('fDate').value = new Date().toISOString().slice(0, 10); $('fReason').value = ''; $('err').style.display = 'none';
  $('hist').innerHTML = d.history.map((h) => `<li>${tag(h.status)} <small style="display:inline">${fmt(h.effectiveDate)}</small>
    ${h.reason ? `<br><small>${esc(h.reason)}</small>` : ''}</li>`).join('') || '<li class="empty">Chưa có lịch sử</li>';
  load();
}

$('picker').onclick = (e) => {
  const s = e.target.dataset.s; if (!s) return;
  picked = s; $('btnSave').disabled = false;
  [...$('picker').children].forEach((b) => b.classList.toggle('on', b.dataset.s === s));
  $('lblReason').textContent = meta.reasonRequired.includes(s) ? 'Lý do điều chỉnh *' : 'Lý do (không bắt buộc)';
};

$('btnSave').onclick = async () => {
  const box = $('err'); box.className = 'err-box';
  try {
    await api(`${API}/students/${current}/change`, { method: 'POST', body: JSON.stringify({ status: picked, effectiveDate: $('fDate').value, reason: $('fReason').value }) });
    await Promise.all([select(current), loadStats()]);
    box.textContent = 'Đã lưu thay đổi trạng thái.'; box.className = 'err-box ok'; box.style.display = 'block';
  } catch (e) { box.textContent = e.message; box.style.display = 'block'; }
};

$('rows').onclick = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) select(+tr.dataset.id); };
$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load(); } };
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 300); };
$('fStatus').onchange = (e) => { state.status = e.target.value; state.page = 1; load(); };
$('fClass').onchange = (e) => { state.classId = e.target.value; state.page = 1; load(); };
document.querySelectorAll('.stat').forEach((c) => (c.onclick = () => { state.status = c.dataset.st; $('fStatus').value = c.dataset.st; state.page = 1; load(); }));
init();