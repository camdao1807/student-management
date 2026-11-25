const API = '/grades';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { courseId: '', term: '', search: '', grade: '', page: 1, limit: 10 };
const GROUP = { A: ['Loại A (Xuất sắc, Giỏi)', 'grn'], B: ['Loại B / B+ (Khá)', ''], C: ['Loại C / C+ (Trung bình)', ''], D: ['Loại D / D+ (Yếu)', 'amb'], F: ['Loại F (Không đạt)', 'red'] };
let summary = null, timer;

function toast(msg, ok = true) {
  const t = $('toast'); t.textContent = msg; t.style.background = ok ? '#16a34a' : '#dc2626'; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 2800);
}
async function api(url, opt = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opt });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : data.message || 'Có lỗi xảy ra');
  return data;
}
const termLabel = (t) => { const [a, b, hk] = t.split('-'); return `Học kỳ ${hk.replace('HK', '')} • ${a}-${b}`; };
const qs = (extra = {}) => { const p = new URLSearchParams(); Object.entries({ ...state, ...extra }).forEach(([k, v]) => v !== '' && p.set(k, v)); return p; };
const letterTag = (l) => l ? `<span class="tag g-${l[0]}">${l}</span>` : '<span class="mut">—</span>';
const eligTag = (b) => `<span class="tag ${b ? 's-dropped' : 's-active'}">${b ? 'Cấm thi' : 'Đủ ĐK'}</span>`;

async function init() {
  const o = await api(`${API}/options`);
  $('fCourse').innerHTML = o.courses.map((c) => `<option value="${c.id}">${esc(c.code)} - ${esc(c.name)}</option>`).join('') || '<option value="">Chưa có môn học</option>';
  $('fTerm').innerHTML = o.terms.map((t) => `<option value="${t}">${termLabel(t)}</option>`).join('');
  $('fClass').innerHTML = o.classes.map((c) => `<option value="${c.id}">${esc(c.code)} - ${esc(c.name)}</option>`).join('');
  $('fTerm').value = o.currentTerm; state.term = o.currentTerm; state.courseId = $('fCourse').value;
  load();
}

function renderSummary(s) {
  summary = s;
  $('gAvg4').innerHTML = s.avg4 === null ? '—' : `${s.avg4.toFixed(2)} <small>/ 4.0</small>`;
  $('gAvg10').textContent = s.avg10 === null ? 'Chưa có điểm tổng kết' : `Thang 10: ${s.avg10.toFixed(2)}`;
  $('gPass').textContent = s.passRate === null ? '—' : `${s.passRate}%`;
  $('gPassSub').textContent = `${s.graded} / ${s.total} sinh viên có điểm`;
  $('gMissing').textContent = s.missing;
  $('gLock').textContent = s.total === 0 ? 'Chưa có dữ liệu' : s.locked ? 'Đã khóa sổ' : 'Đang mở nhập';
  $('gLockSub').textContent = s.locked ? 'Không thể sửa điểm' : 'Có thể nhập / sửa điểm';
  $('btnLock').textContent = s.locked ? 'Mở khóa sổ điểm' : 'Khóa sổ điểm';
  $('dist').innerHTML = s.graded ? s.distribution.map((d) => {
    const p = Math.round((d.count / s.graded) * 100);
    return `<div class="wrow"><div class="l"><span>${GROUP[d.group][0]}</span><b>${p}% (${d.count})</b></div><div class="progress ${GROUP[d.group][1]}"><i style="width:${p}%"></i></div></div>`;
  }).join('') : '<div class="empty">Chưa có điểm tổng kết</div>';
}

function cell(r, f, locked, disabled) {
  const v = r[f] === null ? '' : r[f];
  return `<input class="sc" type="number" min="0" max="10" step="0.1" data-id="${r.id}" data-f="${f}" value="${v}" ${locked || disabled ? 'disabled' : ''}>`;
}

async function load() {
  if (!state.courseId) { $('rows').innerHTML = '<tr><td colspan="11" class="empty">Chưa có môn học. Hãy thêm môn ở trang Quản lý môn học.</td></tr>'; return; }
  try {
    const d = await api(`${API}/sheet?${qs()}`);
    const c = d.course;
    $('weights').innerHTML = `<span class="mut">Trọng số thành phần:</span><span class="chip">Chuyên cần ${c.wAttendance}%</span><span class="chip">Bài tập / Lab ${c.wAssignment}%</span><span class="chip">Giữa kỳ ${c.wMidterm}%</span><span class="chip">Cuối kỳ ${c.wFinal}%</span>`;
    renderSummary(d.summary);
    const off = (state.page - 1) * state.limit;
    $('rows').innerHTML = d.items.length ? d.items.map((r, i) => `
      <tr data-id="${r.id}" class="${r.banned ? 'banned' : ''}">
        <td>${String(off + i + 1).padStart(2, '0')}</td><td><b>${esc(r.studentCode)}</b></td>
        <td>${esc(r.fullName)}<small>${r.gender === 'female' ? 'Nữ' : r.gender === 'male' ? 'Nam' : ''} • ${esc(r.dob)}</small></td><td>${esc(r.classCode)}</td>
        <td>${cell(r, 'attendance', r.isLocked)}</td><td>${cell(r, 'assignment', r.isLocked)}</td><td>${cell(r, 'midterm', r.isLocked)}</td>
        <td class="c-elig">${eligTag(r.banned)}</td><td>${cell(r, 'finalExam', r.isLocked, r.banned)}</td>
        <td class="c-total"><b>${r.total10 === null ? '—' : r.total10.toFixed(1)}</b></td><td class="c-letter">${letterTag(r.letter)}</td></tr>`).join('')
      : '<tr><td colspan="11" class="empty">Bảng điểm chưa có sinh viên. Bấm “Thêm lớp vào bảng điểm” để bắt đầu.</td></tr>';
    const pages = Math.max(1, Math.ceil(d.total / state.limit));
    $('info').textContent = `Hiển thị ${d.items.length} / ${d.total} sinh viên`;
    $('pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button class="sm ${i + 1 === state.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
    loadTrend();
  } catch (e) { toast(e.message, false); }
}

// Theo dõi điểm trung bình qua các học kỳ (một môn hoặc tất cả các môn)
async function loadTrend() {
  try {
    const all = $('tScope').value === 'all';
    const d = await api(`${API}/trend${all || !state.courseId ? '' : `?courseId=${state.courseId}`}`);
    $('trendRows').innerHTML = d.items.length ? d.items.map((r) => `<tr class="pick ${r.term === state.term ? 'sel' : ''}" data-term="${r.term}">
      <td><b>${termLabel(r.term)}</b></td><td>${r.graded} / ${r.total}</td><td>${r.avg10 === null ? '—' : r.avg10.toFixed(2)}</td>
      <td>${r.avg4 === null ? '—' : r.avg4.toFixed(2)}</td><td>${r.passRate === null ? '—' : r.passRate + '%'}</td>
      <td><div class="progress"><i style="width:${r.avg4 === null ? 0 : Math.round((r.avg4 / 4) * 100)}%"></i></div></td></tr>`).join('')
      : '<tr><td colspan="6" class="empty">Chưa có dữ liệu điểm.</td></tr>';
  } catch (e) { toast(e.message, false); }
}
$('tScope').onchange = loadTrend;
$('trendRows').onclick = (e) => {
  const tr = e.target.closest('tr[data-term]'); if (!tr) return;
  state.term = tr.dataset.term; $('fTerm').value = state.term; state.page = 1; load();
};

// Lưu từng ô điểm khi rời ô nhập, cập nhật tại chỗ để không mất vị trí con trỏ
$('rows').onchange = async (e) => {
  const inp = e.target; if (!inp.classList.contains('sc')) return;
  const raw = inp.value.trim(); const val = raw === '' ? null : Number(raw);
  if (val !== null && (isNaN(val) || val < 0 || val > 10)) { toast('Điểm phải từ 0 đến 10', false); return load(); }
  try {
    const r = await api(`${API}/${inp.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ [inp.dataset.f]: val }) });
    const tr = inp.closest('tr');
    tr.classList.toggle('banned', r.banned);
    tr.querySelector('.c-elig').innerHTML = eligTag(r.banned);
    tr.querySelector('.c-total').innerHTML = `<b>${r.total10 === null ? '—' : r.total10.toFixed(1)}</b>`;
    tr.querySelector('.c-letter').innerHTML = letterTag(r.letter);
    tr.querySelector('[data-f=finalExam]').disabled = r.banned;
    renderSummary(await api(`${API}/summary?${qs()}`));
  } catch (err) { toast(err.message, false); load(); }
};

const open = (id) => $(id).classList.add('show');
const closeAll = () => document.querySelectorAll('.overlay').forEach((m) => m.classList.remove('show'));
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeAll));
$('btnEnroll').onclick = () => { $('eEnroll').style.display = 'none'; open('mEnroll'); };
$('btnDoEnroll').onclick = async () => {
  try {
    const r = await api(`${API}/enroll`, { method: 'POST', body: JSON.stringify({ courseId: +state.courseId, term: state.term, classId: +$('fClass').value }) });
    closeAll(); toast(r.added ? `Đã thêm ${r.added} sinh viên vào bảng điểm` : 'Không có sinh viên mới để thêm'); load();
  } catch (e) { $('eEnroll').textContent = e.message; $('eEnroll').style.display = 'block'; }
};
$('btnLock').onclick = async () => {
  const lock = !(summary && summary.locked);
  if (!confirm(lock ? 'Khóa sổ điểm? Sau khi khóa sẽ không sửa được điểm.' : 'Mở khóa sổ điểm để cho phép sửa điểm?')) return;
  try { await api(`${API}/lock`, { method: 'POST', body: JSON.stringify({ courseId: +state.courseId, term: state.term, locked: lock }) }); toast(lock ? 'Đã khóa sổ điểm' : 'Đã mở khóa sổ điểm'); load(); }
  catch (e) { toast(e.message, false); }
};

$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load(); } };
$('fCourse').onchange = (e) => { state.courseId = e.target.value; state.page = 1; load(); };
$('fTerm').onchange = (e) => { state.term = e.target.value; state.page = 1; load(); };
$('fGrade').onchange = (e) => { state.grade = e.target.value; state.page = 1; load(); };
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 300); };
init().catch((e) => toast(e.message, false));
