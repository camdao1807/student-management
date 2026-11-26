/* Tab "Dạy thay & ngày công" + lịch sử đổi giảng viên. Dùng chung $, esc, fmt, api, open, closeAll, LABEL từ advisor-classe-sections.js */
const SAPI = '/substitute-teachings';
const SLABEL = { assigned: 'Đã phân công', completed: 'Đã hoàn thành' };
const SCOLOR = { assigned: 's-upcoming', completed: 's-active' };
const sq = { search: '', date: '', sectionId: '', employeeId: '', status: '' };
const now = new Date();
let sTimer, workLast = null;
const q2 = (o) => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v !== '' && v != null && p.set(k, v)); return p; };
const optSec = (arr, first) => `<option value="">${first}</option>` + arr.map((x) => `<option value="${x.id}" data-lec="${esc(x.lecturerName || '')}">${esc(x.code)} - ${esc(x.name)} (${esc(x.termLabel)})</option>`).join('');
const opt = (arr, first) => `<option value="">${first}</option>` + arr.map((x) => `<option value="${x.id}">${esc(x.code)} - ${esc(x.name)}</option>`).join('');

function showTab(name) {
  document.querySelectorAll('.av-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $('tabCvht').hidden = name !== 'cvht'; $('tabSub').hidden = name !== 'sub';
  name === 'sub' ? loadSub() : loadChanges();
}
document.querySelectorAll('.av-tab').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

async function loadSubOptions() {
  const { classes, sections, employees } = await api(`${SAPI}/options`);
  $('hClass').innerHTML = opt(classes, 'Lớp: Tất cả'); $('sClass').innerHTML = optSec(sections, 'Lớp học phần: Tất cả');
  $('mClass').innerHTML = optSec(sections, '-- Chọn lớp học phần --'); $('mEmp').innerHTML = opt(employees, '-- Chọn giáo viên --');
  $('sEmp').innerHTML = opt(employees, 'Giáo viên: Tất cả'); $('wEmp').innerHTML = opt(employees, 'Giáo viên: Tất cả');
  $('wMonth').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${i + 1}</option>`).join('');
  $('wYear').innerHTML = [-2, -1, 0, 1].map((d) => `<option>${now.getFullYear() + d}</option>`).join('');
  $('wMonth').value = now.getMonth() + 1; $('wYear').value = now.getFullYear();
}

/* ---- Lịch sử đổi giảng viên (tab 1) ---- */
async function loadChanges() {
  try {
    const { items, total } = await api(`${SAPI}/changes?${q2({ classId: $('hClass').value })}`);
    $('hRows').innerHTML = items.length ? items.map((r, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td>
      <td><span class="av-code">${esc(r.classCode)}</span></td>
      <td><span class="av-code">${esc(r.oldCode)}</span> ${esc(r.oldName)}</td><td class="av-arrow">→</td>
      <td><span class="av-code">${esc(r.newCode)}</span> ${esc(r.newName)}</td>
      <td>${fmt(r.date)}</td><td>—</td><td>—</td></tr>`).join('')
      : '<tr><td colspan="8" class="empty">Chưa có lần đổi giảng viên nào.</td></tr>';
    $('hInfo').textContent = `${total} lần đổi giảng viên`;
  } catch (e) { $('hRows').innerHTML = `<tr><td colspan="8" class="empty">${esc(e.message)}</td></tr>`; }
}
$('hClass').onchange = loadChanges;

/* ---- Dạy thay + thống kê (tab 2) ---- */
async function loadSub() {
  try {
    const per = q2({ month: $('wMonth').value, year: $('wYear').value, employeeId: $('wEmp').value });
    const [list, st, wd] = await Promise.all([api(`${SAPI}?${q2(sq)}`), api(`${SAPI}/stats?${per}`), api(`${SAPI}/workdays?${per}`)]);
    const pct = (n) => (st.total ? Math.round((n / st.total) * 1000) / 10 : 0);
    $('ssTotal').textContent = st.total; $('sbTotal').style.width = '100%';
    $('ssDone').textContent = st.completed; $('ssPend').textContent = st.assigned;
    $('sbDone').style.width = pct(st.completed) + '%'; $('sbPend').style.width = pct(st.assigned) + '%';
    $('ssDoneSub').innerHTML = `<b>${pct(st.completed)}%</b> Đã xác nhận thực tế`;
    $('ssPendSub').innerHTML = `<b>${pct(st.assigned)}%</b> Chưa tính ngày công`;
    $('ssDays').textContent = st.workdays; $('sbDays').style.width = Math.min(100, st.workdays * 10) + '%';
    $('ssDaysSub').textContent = `Tháng ${st.month}/${st.year}`;
    $('sInfo').innerHTML = `Hiển thị <b>${list.items.length}</b> phân công`;
    $('sRows').innerHTML = list.items.length ? list.items.map((r, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td>
      <td><b>${fmt(r.date)}</b></td><td><span class="av-code">${esc(r.sectionCode)}</span><small>${esc(r.subjectName)}</small></td><td>${esc(r.mainName || '—')}</td>
      <td><b>${esc(r.subName)}</b></td><td><span class="av-st ${SCOLOR[r.status]}">${SLABEL[r.status]}</span></td><td>${esc(r.note || '—')}</td>
      <td class="av-act">${r.status === 'assigned' ? `<button class="sm" data-done="${r.id}">Xác nhận</button>` : ''}<button class="sm" data-del="${r.id}">Xóa</button></td></tr>`).join('')
      : '<tr><td colspan="8" class="empty">Chưa có phân công dạy thay nào khớp bộ lọc.</td></tr>';
    workLast = wd; $('wTotal').textContent = wd.total;
    $('wSum').innerHTML = wd.summary.length ? wd.summary.map((r, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td><b>${esc(r.name)}</b> <span class="av-code">${esc(r.code)}</span></td><td style="text-align:right"><b style="color:var(--pri)">${r.days}</b> ngày</td></tr>`).join('')
      : '<tr><td colspan="3" class="empty">Không có ngày công trong kỳ này.</td></tr>';
    $('wDet').innerHTML = wd.details.length ? wd.details.map((r) => `<tr><td>${esc(r.subName)}</td><td>${fmt(r.date)}</td><td><span class="av-code">${esc(r.sectionCode)}</span></td><td>${esc(r.mainName || '—')}</td><td>${esc(r.note || '—')}</td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">Không có dữ liệu.</td></tr>';
  } catch (e) { alert(e.message); }
}

$('sRows').onclick = async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    if (b.dataset.done && confirm('Xác nhận giáo viên đã dạy thay xong? Lịch này sẽ được tính ngày công.')) { await api(`${SAPI}/${b.dataset.done}/complete`, { method: 'PATCH', body: '{}' }); loadSub(); }
    if (b.dataset.del && confirm('Xóa phân công dạy thay này?')) { await api(`${SAPI}/${b.dataset.del}`, { method: 'DELETE' }); loadSub(); }
  } catch (err) { alert(err.message); }
};
$('mClass').onchange = () => { const o = $('mClass').selectedOptions[0]; $('mMain').textContent = o && o.value ? `Giảng viên phụ trách lớp học phần: ${o.dataset.lec || 'Chưa phân công'}` : ''; };
$('btnAddSub').onclick = () => { $('eSub').style.display = 'none'; $('mMain').textContent = ''; $('mDate').value = now.toISOString().slice(0, 10); $('mNote').value = ''; open('mSub'); };
$('btnSaveSub').onclick = async () => {
  try {
    await api(SAPI, { method: 'POST', body: JSON.stringify({ sectionId: +$('mClass').value, substituteEmployeeId: +$('mEmp').value, teachingDate: $('mDate').value, note: $('mNote').value }) });
    closeAll(); loadSub();
  } catch (e) { $('eSub').textContent = e.message; $('eSub').style.display = 'block'; }
};
const sFilter = (id, key, ev = 'onchange') => ($(id)[ev] = (e) => { sq[key] = e.target.value.trim(); loadSub(); });
sFilter('sDate', 'date'); sFilter('sClass', 'sectionId'); sFilter('sEmp', 'employeeId'); sFilter('sStatus', 'status');
$('sQ').oninput = (e) => { clearTimeout(sTimer); sTimer = setTimeout(() => { sq.search = e.target.value.trim(); loadSub(); }, 300); };
$('sReset').onclick = () => { Object.keys(sq).forEach((k) => (sq[k] = '')); ['sQ', 'sDate', 'sClass', 'sEmp', 'sStatus'].forEach((id) => ($(id).value = '')); loadSub(); };
['wEmp', 'wMonth', 'wYear'].forEach((id) => ($(id).onchange = loadSub));
document.querySelectorAll('[data-sst]').forEach((c) => (c.onclick = () => { sq.status = c.dataset.sst; $('sStatus').value = c.dataset.sst; loadSub(); }));
$('wExport').onclick = () => {
  if (!workLast) return;
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Giáo viên dạy thay', 'Ngày dạy', 'Lớp học phần', 'GV chính', 'Ghi chú'], ...workLast.details.map((r) => [r.subName, r.date, r.sectionCode, r.mainName, r.note || '']),
    [], ['Tổng số ngày công', workLast.total]];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `ngay-cong-${workLast.month}-${workLast.year}.csv`; a.click();
};

loadSubOptions().then(loadChanges);
