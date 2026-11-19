const API = '/courses';
const CAT = { general: 'Đại cương', foundation: 'Cơ sở ngành', major: 'Chuyên ngành', elective: 'Tự chọn' };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { page: 1, limit: 10, search: '', department: '', category: '', status: '', credits: '' };
let current = null, courseList = [], editing = null, timer;

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
const creditText = (c) => `${c.credits} (${c.theoryCredits}+${c.practiceCredits})`;
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

async function init() {
  const o = await api(`${API}/options`);
  courseList = o.courses;
  $('fDept').innerHTML += o.departments.map((d) => `<option>${esc(d)}</option>`).join('');
  $('deptList').innerHTML = o.departments.map((d) => `<option value="${esc(d)}">`).join('');
  loadStats(); load();
}

async function loadStats() {
  const s = await api(`${API}/stats`);
  $('sTotal').textContent = s.total;
  $('sActive').innerHTML = `${s.active} <small>môn</small>`;
  $('sActiveSub').textContent = `${pct(s.active, s.total)}% tổng số môn`;
  $('sPre').innerHTML = `${s.withPrereq} <small>môn</small>`;
  $('sPreSub').textContent = `${pct(s.withPrereq, s.total)}% có ràng buộc`;
  $('sApp').innerHTML = `${pct(s.approved, s.total)}%`;
  $('sAppSub').textContent = `${s.approved}/${s.total} đề cương`;
}

async function load() {
  const p = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => v !== '' && p.set(k, v));
  const { items, total } = await api(`${API}?${p}`);
  const off = (state.page - 1) * state.limit;
  $('rows').innerHTML = items.length ? items.map((c, i) => `
    <tr class="pick ${current === c.id ? 'sel' : ''}" data-id="${c.id}">
      <td>${String(off + i + 1).padStart(2, '0')}</td><td><b>${esc(c.code)}</b></td>
      <td>${esc(c.name)}<small>${esc(c.description)}</small></td><td>${creditText(c)}</td>
      <td>${esc(c.department)}</td><td>${c.prerequisiteCount || '—'}</td>
      <td><span class="tag ${c.status === 'active' ? 's-active' : 's-ended'}">${c.status === 'active' ? 'Đang giảng dạy' : 'Ngưng'}</span></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">Không có môn học nào khớp bộ lọc.</td></tr>';
  const pages = Math.max(1, Math.ceil(total / state.limit));
  $('info').textContent = `Hiển thị ${items.length} / ${total} môn học`;
  $('pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button class="sm ${i + 1 === state.page ? 'on' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
}

async function showDetail(id) {
  current = id;
  const c = await api(`${API}/${id}`);
  editing = c;
  const used = new Set([c.id, ...c.prerequisites.map((p) => p.courseId)]);
  const w = [['Chuyên cần & Ý thức học tập', c.wAttendance, ''], ['Bài tập / Thực hành Lab', c.wAssignment, 'grn'], ['Thi giữa kỳ', c.wMidterm, 'amb'], ['Thi kết thúc học phần', c.wFinal, 'red']];
  $('noSel').style.display = 'none';
  $('detail').style.display = 'block';
  $('detail').innerHTML = `
    <div><span class="tag s-graduated">${esc(c.code)}</span>
      <span class="tag ${c.status === 'active' ? 's-active' : 's-ended'}">${c.status === 'active' ? 'Đang giảng dạy' : 'Ngưng giảng dạy'}</span></div>
    <h2>${esc(c.name)}</h2>
    <div class="mut">${esc(c.description)}<br>${CAT[c.category]} • ${c.isRequired ? 'Bắt buộc' : 'Tự chọn'} • ${esc(c.department)}</div>
    <div style="margin-top:10px"><button id="btnEdit">Chỉnh sửa</button>
      <span class="tag ${c.syllabusApproved ? 's-active' : 's-suspended'}" style="margin-left:6px">${c.syllabusApproved ? 'Đề cương đã nghiệm thu' : 'Đề cương chưa nghiệm thu'}</span></div>
    <h4>Cơ cấu khối lượng (${c.credits} tín chỉ)</h4>
    <div class="scorebox"><div><b>${c.theoryCredits * 15}</b><span>Tiết lý thuyết</span></div><div><b>${c.practiceCredits * 30}</b><span>Tiết thực hành</span></div><div><b>${c.credits * 30}</b><span>Giờ tự học</span></div></div>
    <h4>Chuỗi điều kiện ràng buộc</h4>
    ${c.prerequisites.map((p) => `<div class="pre"><span class="tag t-${p.type}">${p.type === 'prerequisite' ? 'TIÊN QUYẾT' : 'HỌC TRƯỚC'}</span>
      <span class="grow"><b>${esc(p.code)}</b> - ${esc(p.name)}</span><button class="sm" data-rm="${p.id}" title="Gỡ điều kiện">Gỡ</button></div>`).join('') || '<div class="mut">Chưa có điều kiện ràng buộc.</div>'}
    <div class="pre-add"><select id="preSel"><option value="">-- Chọn môn --</option>${courseList.filter((x) => !used.has(x.id)).map((x) => `<option value="${x.id}">${esc(x.code)} - ${esc(x.name)}</option>`).join('')}</select>
      <select id="preType"><option value="prerequisite">Tiên quyết</option><option value="prior">Học trước</option></select><button id="btnAddPre">Thêm</button></div>
    <h4>Cơ cấu điểm đánh giá</h4>
    ${w.map(([n, v, cl]) => `<div class="wrow"><div class="l"><span>${n}</span><b>${v}%</b></div><div class="progress ${cl}"><i style="width:${v}%"></i></div></div>`).join('')}`;
  load();
}

$('detail').onclick = async (e) => {
  try {
    if (e.target.id === 'btnEdit') return openModal(editing);
    if (e.target.dataset.rm) { await api(`${API}/${current}/prerequisites/${e.target.dataset.rm}`, { method: 'DELETE' }); }
    else if (e.target.id === 'btnAddPre') {
      const id = +$('preSel').value; if (!id) return toast('Vui lòng chọn môn điều kiện', false);
      await api(`${API}/${current}/prerequisites`, { method: 'POST', body: JSON.stringify({ prerequisiteId: id, type: $('preType').value }) });
    } else return;
    await Promise.all([showDetail(current), loadStats()]); toast('Đã cập nhật điều kiện ràng buộc');
  } catch (err) { toast(err.message, false); }
};

// ----- Modal thêm / sửa
const open = (id) => $(id).classList.add('show');
const closeAll = () => document.querySelectorAll('.overlay').forEach((m) => m.classList.remove('show'));
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeAll));
const sumW = () => { const s = [...document.querySelectorAll('.w')].reduce((a, i) => a + (+i.value || 0), 0); $('wSum').textContent = `Tổng trọng số: ${s}% ${s === 100 ? '(hợp lệ)' : '(phải bằng 100%)'}`; $('wSum').style.color = s === 100 ? 'var(--ok)' : 'var(--err)'; };
document.querySelectorAll('.w').forEach((i) => (i.oninput = sumW));

function openModal(c) {
  $('mTitle').textContent = c ? `Chỉnh sửa ${c.code}` : 'Thêm môn học mới';
  const d = c || { code: '', name: '', description: '', department: '', category: 'major', theoryCredits: 2, practiceCredits: 1, wAttendance: 10, wAssignment: 20, wMidterm: 20, wFinal: 50, isRequired: true, syllabusApproved: false, status: 'active' };
  $('fCode').value = d.code; $('fName').value = d.name; $('fDesc').value = d.description || ''; $('fDepartment').value = d.department;
  $('fCategory').value = d.category; $('fTheory').value = d.theoryCredits; $('fPractice').value = d.practiceCredits;
  $('wAtt').value = d.wAttendance; $('wAss').value = d.wAssignment; $('wMid').value = d.wMidterm; $('wFin').value = d.wFinal;
  $('fRequired').checked = d.isRequired; $('fApproved').checked = d.syllabusApproved; $('fStat').value = d.status;
  $('eCourse').style.display = 'none'; $('btnSave').dataset.id = c ? c.id : ''; sumW(); open('mCourse');
}
$('btnAdd').onclick = () => openModal(null);
$('btnSave').onclick = async () => {
  const id = $('btnSave').dataset.id;
  const body = {
    code: $('fCode').value, name: $('fName').value, description: $('fDesc').value, department: $('fDepartment').value,
    category: $('fCategory').value, theoryCredits: +$('fTheory').value, practiceCredits: +$('fPractice').value,
    wAttendance: +$('wAtt').value, wAssignment: +$('wAss').value, wMidterm: +$('wMid').value, wFinal: +$('wFin').value,
    isRequired: $('fRequired').checked, syllabusApproved: $('fApproved').checked, status: $('fStat').value,
  };
  try {
    const saved = await api(id ? `${API}/${id}` : API, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
    closeAll(); toast(id ? 'Đã cập nhật môn học' : 'Đã thêm môn học');
    const o = await api(`${API}/options`); courseList = o.courses;
    await Promise.all([loadStats(), showDetail(saved.id)]);
  } catch (e) { $('eCourse').textContent = e.message; $('eCourse').style.display = 'block'; }
};

$('rows').onclick = (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) showDetail(+tr.dataset.id).catch((x) => toast(x.message, false)); };
$('pages').onclick = (e) => { if (e.target.dataset.p) { state.page = +e.target.dataset.p; load(); } };
$('q').oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; load(); }, 300); };
[['fDept', 'department'], ['fCat', 'category'], ['fCredits', 'credits'], ['fStatus', 'status']].forEach(([id, key]) => {
  $(id).onchange = (e) => { state[key] = e.target.value; state.page = 1; load(); };
});
init().catch((e) => toast(e.message, false));
