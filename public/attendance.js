/* =========================================================
   Điểm danh sinh viên
   API dự kiến (xem hàm api() — mở trang với ?mock=1 để chạy thử không cần backend):
   GET  /attendance/sections                      -> [{id, code, name, lecturerName, room, schedule, studentCount, totalSessions}]
   GET  /attendance/sections/:id/sessions         -> [{id, number, date, status:'locked'|'open'|'future', presentCount, total, lockedBy}]
   GET  /attendance/sessions/:id                  -> {note, records:[{studentId, studentCode, fullName, email, classCode, status|null, absentBefore,
                                                            eligible, studentStatus: studying|reserved|dropped|graduated|no_status}]}
   PUT  /attendance/sessions/:id  {records:[{studentId,status}], note, lock}
   GET  /attendance/sections/:id/students         -> như records ở trên (status=null) — dùng khi lớp chưa có buổi nào
   POST /attendance/sections/:id/sessions {date?}  -> mở buổi học tiếp theo (mặc định hôm nay)
   status: present | excused | absent | late
   ========================================================= */
const API = '/attendance';
const MOCK = new URLSearchParams(location.search).has('mock');
const BAN_RATE = 20;   // % vắng bị cấm thi
const WARN_RATE = 15;  // % vắng bắt đầu cảnh báo
const STATUS = {
  present: { label: 'Có mặt', short: 'Có mặt', color: 'var(--pri)' },
  excused: { label: 'Có phép', short: 'Phép', color: '#93c5fd' },
  absent: { label: 'Không phép', short: 'Vắng', color: '#dc2626' },
  late: { label: 'Đi muộn', short: 'Muộn', color: '#4b5563' },
};
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const fmtDate = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
const pad = (n) => String(n).padStart(2, '0');
/** Bỏ dấu tiếng Việt để tìm kiếm "nguyen" vẫn ra "Nguyễn" */
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const state = {
  sections: [], section: null, sessions: [], session: null,
  records: [], snapshot: '', dirty: false,
  page: 1, limit: 10, q: '', status: 'all', risk: 0, showInactive: false,
};

/* ---------- API ---------- */
async function api(url, method = 'GET', body) {
  if (MOCK) return mockApi(url, method, body);
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message;
    throw new Error(Array.isArray(msg) ? msg.join('\n') : msg || `Lỗi ${res.status}`);
  }
  return data;
}

function showToast(message, success = true) {
  const t = $('toast');
  t.textContent = message;
  t.style.background = success ? 'var(--ok)' : 'var(--err)';
  t.style.display = 'block';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

/* ---------- Tính toán ---------- */
const isLocked = () => state.session?.status === 'locked';
const readOnly = () => !state.session || isLocked();
// Chỉ sinh viên "Đang học" (eligible) phải điểm danh; SV thôi học / bảo lưu / tốt nghiệp chỉ để xem
const isActive = (r) => r.eligible !== false;
const activeRecords = () => state.records.filter(isActive);
const STUDY_STATUS = { dropped: 'Thôi học', reserved: 'Bảo lưu', graduated: 'Đã tốt nghiệp' };
const totalSessions = () => state.section?.totalSessions || state.sessions.length || 1;
function absentCount(r) { return (r.absentBefore || 0) + (r.status === 'absent' ? 1 : 0); }
function rateOf(r) { return pct(absentCount(r), totalSessions()); }
function levelOf(r) { const v = rateOf(r); return v > BAN_RATE ? 'risk' : v > WARN_RATE ? 'warn' : ''; }
function counts() {
  const c = { present: 0, excused: 0, absent: 0, late: 0, unmarked: 0 };
  activeRecords().forEach((r) => { c[r.status || 'unmarked'] += 1; });
  return c;
}
function markDirty() { state.dirty = true; }
function confirmDiscard() {
  if (!state.dirty) return true;
  if (!confirm('Có thay đổi chưa lưu. Bỏ các thay đổi này?')) return false;
  state.dirty = false;
  return true;
}

/* ---------- Tải dữ liệu ---------- */
async function init() {
  try {
    state.sections = await api(`${API}/sections`);
    if (!state.sections.length) { showError('Chưa có học phần nào để điểm danh.'); renderSectionSelect(); return; }
    renderSectionSelect();
    await selectSection(state.sections[0].id);
  } catch (e) { showError(`Không tải được danh sách học phần: ${e.message}`); }
}
function showError(msg) { $('pageError').textContent = msg; $('pageError').hidden = false; }

async function selectSection(id) {
  $('pageError').hidden = true;
  state.section = state.sections.find((s) => s.id === id);
  state.sessions = await api(`${API}/sections/${encodeURIComponent(id)}/sessions`);
  const pick = state.sessions.find((s) => s.status === 'open')
    || [...state.sessions].reverse().find((s) => s.status === 'locked');
  renderSectionInfo();
  if (pick) await loadSession(pick.id);
  else {
    state.session = null; state.dirty = false; state.page = 1; $('note').value = '';
    try { state.records = (await api(`${API}/sections/${encodeURIComponent(id)}/students`)).map((r) => ({ ...r, status: null })); }
    catch (_) { state.records = []; }
    state.snapshot = JSON.stringify(state.records.map(() => null));
    renderAll();
    showToast('Lớp học phần chưa có buổi nào. Bấm "Mở buổi học tiếp theo" để bắt đầu điểm danh.');
  }
}

async function loadSession(id) {
  state.session = state.sessions.find((s) => s.id === id);
  $('reportState').hidden = false; $('reportState').textContent = 'Đang tải danh sách điểm danh...';
  try {
    const data = await api(`${API}/sessions/${encodeURIComponent(id)}`);
    state.records = (data.records || []).map((r) => ({ ...r, status: r.status || null }));
    state.snapshot = JSON.stringify(state.records.map((r) => r.status));
    $('note').value = data.note || '';
    state.dirty = false; state.page = 1;
    $('reportState').hidden = true;
    renderAll();
  } catch (e) {
    $('reportState').hidden = true;
    showError(`Không tải được buổi học: ${e.message}`);
  }
}

/* ---------- Hiển thị ---------- */
function renderSectionSelect() {
  $('sectionSelect').innerHTML = state.sections.map((s) =>
    `<option value="${esc(s.id)}">${esc(s.code)} - ${esc(s.name)}</option>`).join('') || '<option value="">Chưa có học phần</option>';
}
function renderSectionInfo() {
  const s = state.section; if (!s) return;
  $('sectionSelect').value = s.id;
  $('sectionInfo').innerHTML = `<li>GV: <b>${esc(s.lecturerName || '—')}</b></li><li>Phòng: <b>${esc(s.room || '—')}</b></li>
    <li>Lịch: <b>${esc(s.schedule || '—')}</b></li><li>Sĩ số: <b>${esc(s.studentCount ?? '—')}</b></li>`;
}
function renderChips() {
  $('sessionTotal').textContent = totalSessions();
  $('btnOpenSession').hidden = state.sessions.some((s) => s.status === 'open') || !state.sessions.some((s) => s.status === 'future');
  $('sessionChips').innerHTML = state.sessions.map((s) => {
    const active = state.session?.id === s.id ? ' active' : '';
    const label = s.status === 'open' ? `Buổi ${pad(s.number)} - Hôm nay` : `B.${pad(s.number)}`;
    return `<button type="button" class="chip ${s.status}${active}" data-id="${esc(s.id)}" ${s.status === 'future' ? 'disabled' : ''}>${label}</button>`;
  }).join('');
}
function filtered() {
  const q = norm(state.q);
  return state.records.filter((r) => {
    if (!state.showInactive && !isActive(r)) return false;
    if (q && !norm(`${r.studentCode} ${r.fullName} ${r.email || ''}`).includes(q)) return false;
    if (state.status === 'unmarked' ? r.status : state.status !== 'all' && r.status !== state.status) return false;
    if (state.risk && rateOf(r) <= state.risk) return false;
    return true;
  });
}
function renderTable() {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / state.limit));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.limit;
  const locked = readOnly();
  $('attBody').innerHTML = rows.slice(start, start + state.limit).map((r, i) => {
    const lvl = levelOf(r);
    const btns = Object.keys(STATUS).map((k) =>
      `<button type="button" data-status="${k}" class="${r.status === k ? 'on-' + k : ''}" ${locked || !isActive(r) ? 'disabled' : ''}>${STATUS[k].short}</button>`).join('');
    return `<tr class="${lvl}${isActive(r) ? '' : ' inactive'}" data-id="${esc(r.studentId)}">
      <td>${pad(start + i + 1)}</td>
      <td class="mssv">${esc(r.studentCode)}</td>
      <td><strong>${esc(r.fullName)}</strong>${isActive(r) ? '' : `<span class="stu-badge">${esc(STUDY_STATUS[r.studentStatus] || 'Không còn học')}</span>`}<small>${esc(r.email || '')}</small></td>
      <td>${esc(r.classCode || '—')}</td>
      <td><div class="status-seg">${btns}</div></td>
      <td><span class="rate ${lvl}">${absentCount(r)}/${totalSessions()} (${rateOf(r).toFixed(1)}%)</span></td>
    </tr>`;
  }).join('');
  const hidden = state.records.filter((r) => !isActive(r)).length;
  $('inactiveToggle').hidden = hidden === 0;
  $('inactiveCount').textContent = hidden;
  $('attEmpty').hidden = rows.length !== 0;
  $('attEmpty').textContent = state.records.length
    ? `Không có sinh viên nào khớp trong lớp học phần này (chỉ tìm trong ${state.records.length} sinh viên đã ghi danh).`
    : 'Lớp học phần chưa có sinh viên ghi danh.';
  $('recordCount').textContent = `Hiển thị ${Math.min(state.limit, Math.max(0, rows.length - start))} / ${rows.length} sinh viên`;
  $('pageNumber').textContent = `Trang ${state.page} / ${pages}`;
  $('prevPage').disabled = state.page <= 1;
  $('nextPage').disabled = state.page >= pages;
  $('btnAllPresent').disabled = locked;
  $('btnResetMarks').disabled = locked;
}
function renderSummary() {
  const c = counts(); const total = activeRecords().length;
  const s = state.session;
  $('sumTitle').textContent = s ? `Buổi ${pad(s.number)} & Thống kê` : 'Chưa có buổi học';
  $('sessionLabel').textContent = s ? `buổi ${pad(s.number)}` : '';
  $('lockBadge').textContent = s?.status === 'locked' ? 'Đã khóa sổ' : s?.status === 'open' ? 'Đang mở' : 'Chưa mở buổi';
  $('lockBadge').className = `lock-badge ${s?.status || ''}`;
  $('sumTotal').textContent = `${total} SV`;
  $('sumBar').innerHTML = Object.keys(STATUS).map((k) => `<i style="width:${pct(c[k], total)}%;background:${STATUS[k].color}"></i>`).join('');
  $('sumList').innerHTML = Object.keys(STATUS).map((k) =>
    `<li><i class="lg" style="background:${STATUS[k].color}"></i>${STATUS[k].label}<b>${c[k]} (${pct(c[k], total).toFixed(1)}%)</b></li>`).join('')
    + `<li><i class="lg" style="background:#d1d5db"></i>Chưa điểm danh<b>${c.unmarked}</b></li>`;
  const locked = readOnly();
  $('btnLock').disabled = locked || !s; $('btnSave').disabled = locked || !s; $('note').disabled = locked || !s;
}
function renderMetrics() {
  const c = counts(); const total = activeRecords().length;
  const attended = c.present + c.late;
  $('mPresent').textContent = `${pct(attended, total).toFixed(1)}%`;
  $('mPresentBadge').textContent = `${attended}/${total} SV`;
  $('mPresentSub').textContent = c.unmarked ? `Còn ${c.unmarked} SV chưa điểm danh` : 'Đã điểm danh đủ sinh viên';
  const done = state.sessions.filter((s) => s.status === 'locked').length;
  $('mSessions').textContent = done; $('mSessionsTotal').textContent = totalSessions();
  $('mSessionsPct').textContent = `${pct(done, totalSessions()).toFixed(1)}%`;
  $('mSessionsBar').style.width = `${pct(done, totalSessions())}%`;
  $('mWarn').textContent = activeRecords().filter((r) => rateOf(r) > BAN_RATE).length;
  $('mExcused').textContent = c.excused;
}
function renderHistory() {
  const list = state.sessions.filter((s) => s.status === 'locked').slice(-5).reverse();
  $('historyList').innerHTML = list.length ? list.map((s) =>
    `<li data-id="${esc(s.id)}"><span>Buổi ${pad(s.number)} • ${fmtDate(s.date)}<small>${esc(s.lockedBy ? s.lockedBy + ' đã duyệt' : '')}</small></span><b>${s.presentCount ?? '—'}/${s.total ?? '—'} Có mặt</b></li>`).join('')
    : '<li class="empty">Chưa có buổi nào được khóa sổ.</li>';
}
function renderRiskBtn() {
  const b = $('btnRisk');
  b.classList.toggle('on', state.risk > 0);
  b.textContent = state.risk === BAN_RATE ? `Đang lọc: cấm thi (>${BAN_RATE}% vắng)` : `Lọc nguy cơ (>${WARN_RATE}% vắng)`;
}
function renderAll() { renderChips(); renderTable(); renderSummary(); renderMetrics(); renderHistory(); renderRiskBtn(); }
function renderLive() { renderTable(); renderSummary(); renderMetrics(); }

/* ---------- Lưu ---------- */
async function save(lock) {
  const s = state.session; if (!s || isLocked()) return;
  const unmarked = activeRecords().filter((r) => !r.status).length;
  if (lock && unmarked) return showToast(`Còn ${unmarked} sinh viên chưa điểm danh`, false);
  if (lock && !confirm(`Khóa sổ buổi ${pad(s.number)}? Sau khi khóa sẽ không thể chỉnh sửa.`)) return;
  $('btnSave').disabled = $('btnLock').disabled = true;
  try {
    await api(`${API}/sessions/${encodeURIComponent(s.id)}`, 'PUT', {
      records: activeRecords().filter((r) => r.status).map((r) => ({ studentId: r.studentId, status: r.status })),
      note: $('note').value.trim(), lock,
    });
    state.dirty = false;
    showToast(lock ? `Đã khóa sổ điểm danh buổi ${pad(s.number)}` : 'Đã lưu nháp điểm danh');
    state.sessions = await api(`${API}/sections/${encodeURIComponent(state.section.id)}/sessions`);
    const next = lock ? state.sessions.find((x) => x.status === 'open') || state.sessions.find((x) => x.id === s.id) : state.sessions.find((x) => x.id === s.id);
    await loadSession(next.id);
  } catch (e) {
    showToast(`Lưu thất bại: ${e.message}`, false);
    renderSummary();
  }
}

function exportCsv() {
  if (!state.records.length) return showToast('Chưa có dữ liệu để xuất', false);
  const head = ['STT', 'MSSV', 'Họ tên', 'Lớp HC', 'Trạng thái', 'Số buổi vắng', 'Tỷ lệ vắng (%)', 'Trạng thái học tập'];
  const rows = state.records.map((r, i) => [i + 1, r.studentCode, r.fullName, r.classCode || '',
    r.status ? STATUS[r.status].label : 'Chưa điểm danh', absentCount(r), rateOf(r).toFixed(1), isActive(r) ? 'Đang học' : (STUDY_STATUS[r.studentStatus] || 'Không còn học')]);
  const csv = '\uFEFF' + [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `diem-danh-${state.section?.code || 'hoc-phan'}-buoi-${pad(state.session?.number || 0)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ---------- Sự kiện ---------- */
$('sectionSelect').addEventListener('change', async (e) => {
  if (!confirmDiscard()) { e.target.value = state.section?.id; return; }
  try { await selectSection(e.target.value); } catch (err) { showError(err.message); }
});
$('sessionChips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.disabled || b.dataset.id === state.session?.id) return;
  if (confirmDiscard()) loadSession(b.dataset.id);
});
$('historyList').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (li && confirmDiscard()) loadSession(li.dataset.id);
});
$('attBody').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-status]'); if (!b || readOnly()) return;
  const rec = state.records.find((r) => String(r.studentId) === b.closest('tr').dataset.id);
  if (!rec || !isActive(rec)) return;
  rec.status = rec.status === b.dataset.status ? null : b.dataset.status; // bấm lại để bỏ chọn
  markDirty(); renderLive();
});
$('btnAllPresent').addEventListener('click', () => {
  activeRecords().forEach((r) => { if (!r.status) r.status = 'present'; });
  markDirty(); renderLive();
});
$('btnResetMarks').addEventListener('click', () => {
  const old = JSON.parse(state.snapshot || '[]');
  state.records.forEach((r, i) => { r.status = old[i] ?? null; });
  state.dirty = false; renderLive();
});
$('q').addEventListener('input', (e) => { state.q = e.target.value.trim(); state.page = 1; renderTable(); });
$('statusFilter').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; renderTable(); });
$('btnRisk').addEventListener('click', () => { state.risk = state.risk ? 0 : WARN_RATE; state.page = 1; renderRiskBtn(); renderTable(); });
$('btnBan').addEventListener('click', () => {
  state.risk = state.risk === BAN_RATE ? 0 : BAN_RATE; state.page = 1; renderRiskBtn(); renderTable();
  $('attBody').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('chkInactive').addEventListener('change', (e) => { state.showInactive = e.target.checked; state.page = 1; renderTable(); });
$('pageLimit').addEventListener('change', (e) => { state.limit = Number(e.target.value); state.page = 1; renderTable(); });
$('prevPage').addEventListener('click', () => { state.page -= 1; renderTable(); });
$('nextPage').addEventListener('click', () => { state.page += 1; renderTable(); });
$('btnSave').addEventListener('click', () => save(false));
$('btnLock').addEventListener('click', () => save(true));
$('btnOpenSession').addEventListener('click', async () => {
  if (!confirmDiscard()) return;
  try {
    const created = await api(`${API}/sections/${encodeURIComponent(state.section.id)}/sessions`, 'POST', {});
    state.sessions = await api(`${API}/sections/${encodeURIComponent(state.section.id)}/sessions`);
    await loadSession(created.id);
    showToast(`Đã mở buổi ${pad(created.number)}`);
  } catch (e) { showToast(`Không mở được buổi học: ${e.message}`, false); }
});
$('btnExport').addEventListener('click', exportCsv);
$('btnPrint').addEventListener('click', () => window.print());
window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Dữ liệu giả để xem thử (?mock=1) ---------- */
const mockDb = { sessions: null, records: {} };
const MOCK_NAMES = ['Nguyễn Văn An', 'Trần Bảo Minh', 'Đỗ Hoàng Hải', 'Lê Kim Ngân', 'Phạm Thành Trung', 'Vũ Thị Mai',
  'Hoàng Gia Bảo', 'Bùi Thu Hà', 'Đặng Quốc Việt', 'Ngô Khánh Linh', 'Dương Minh Tuấn', 'Lý Thanh Thảo'];
function mockApi(url, method, body) {
  const wait = (v) => new Promise((r) => setTimeout(() => r(JSON.parse(JSON.stringify(v))), 120));
  if (!mockDb.sessions) {
    mockDb.sessions = Array.from({ length: 15 }, (_, i) => ({
      id: `b${i + 1}`, number: i + 1, date: `2025-03-${pad(4 + i)}`,
      status: i < 8 ? 'locked' : i === 8 ? 'open' : 'future', presentCount: 10 + (i % 3), total: 12, lockedBy: 'TS. Lê Quang Huy',
    }));
  }
  if (url === `${API}/sections`) return wait([{ id: 's1', code: 'INT3110', name: 'Lập trình Web & Ứng dụng', lecturerName: 'TS. Lê Quang Huy', room: 'B302', schedule: 'Thứ Ba, ca 2 (09:15 - 11:45)', studentCount: 12, totalSessions: 15 }]);
  if (/\/sections\/.+\/sessions$/.test(url)) {
    if (method === 'POST') {
      const s = mockDb.sessions.find((x) => x.status === 'future');
      if (!s || mockDb.sessions.some((x) => x.status === 'open')) return Promise.reject(new Error('Đang có một buổi học chưa khóa sổ'));
      s.status = 'open';
      return wait({ id: s.id, number: s.number, date: s.date, status: 'open' });
    }
    return wait(mockDb.sessions);
  }
  if (/\/sections\/.+\/students$/.test(url)) {
    return wait(MOCK_NAMES.map((n, i) => ({ studentId: `st${i}`, studentCode: `SV2023${pad(i + 1)}0`, fullName: n,
      email: `sv${i + 1}@sms.edu.vn`, classCode: 'CNTT-K23A', eligible: i !== 11, studentStatus: i === 11 ? 'dropped' : 'studying', status: null, absentBefore: 0 })));
  }
  const m = url.match(/\/sessions\/(b\d+)$/);
  if (m && method === 'GET') {
    mockDb.records[m[1]] ||= { note: '', records: MOCK_NAMES.map((n, i) => ({
      studentId: `st${i}`, studentCode: `SV2023${pad(i + 1)}0`, fullName: n, email: `sv${i + 1}@sms.edu.vn`, classCode: 'CNTT-K23A', eligible: i !== 11, studentStatus: i === 11 ? 'dropped' : 'studying',
      status: mockDb.sessions.find((s) => s.id === m[1]).status === 'locked' ? (i % 7 === 2 ? 'absent' : 'present') : null,
      absentBefore: i === 2 ? 3 : i === 5 ? 2 : i % 4 === 0 ? 1 : 0 })) };
    return wait(mockDb.records[m[1]]);
  }
  if (m && method === 'PUT') {
    const rec = mockDb.records[m[1]]; const map = new Map(body.records.map((r) => [r.studentId, r.status]));
    rec.records.forEach((r) => { r.status = map.get(r.studentId) || null; }); rec.note = body.note;
    if (body.lock) {
      const i = mockDb.sessions.findIndex((s) => s.id === m[1]);
      mockDb.sessions[i].status = 'locked';
      mockDb.sessions[i].presentCount = rec.records.filter((r) => r.status === 'present' || r.status === 'late').length;
      if (mockDb.sessions[i + 1]) mockDb.sessions[i + 1].status = 'open';
    }
    return wait({ ok: true });
  }
  return Promise.reject(new Error('Mock: API chưa hỗ trợ'));
}

init();