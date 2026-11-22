// Cùng origin với server NestJS nên để rỗng. Nếu mở file này từ nơi khác thì đổi thành 'http://localhost:3000'
const API = '';

const PAGES = {
  home:       { title: 'Trang chủ',        desc: '', home: true },
  profile:    { title: 'Hồ sơ cá nhân',    desc: 'Thông tin, lớp, ngành, trạng thái học tập' },
  register:   { title: 'Đăng ký học phần', desc: 'Chọn lớp học phần đang mở (kiểm tra trùng lịch, quá sĩ số)' },
  timetable:  { title: 'Thời khóa biểu',   desc: 'Các lớp học phần đã đăng ký trong học kỳ' },
  grades:     { title: 'Điểm theo môn',    desc: 'Điểm thành phần, điểm tổng, điểm chữ' },
  transcript: { title: 'Bảng điểm',        desc: 'Điểm trung bình học kỳ, GPA tích lũy, xếp loại học lực' },
  attendance: { title: 'Chuyên cần',       desc: 'Số buổi vắng từng môn' },
};
const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#e11d48'];
const routeKey = () => { const k = location.hash.slice(1); return PAGES[k] ? k : 'home'; };
let current = routeKey();

// ---------- Tiện ích ----------
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sid = () => $('studentId').value;
const tid = () => $('termId').value;

const dayName = (d) => (d == null ? '—' : Number(d) === 8 ? 'Chủ nhật' : 'Thứ ' + d);
const periods = (c) => (c.startPeriod != null ? `Tiết ${c.startPeriod}–${c.endPeriod}` : 'Chưa xếp tiết');
const f1 = (v) => (v == null ? '—' : Number(v).toFixed(1));
const fmtDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : s; };
const initials = (name) => (name || '').trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || 'SV';
// Chưa biết tên field trong term.entity.ts nên thử các tên hay gặp
const termLabel = (t) => (t ? esc(t.termName ?? t.name ?? t.termCode ?? t.code ?? 'Học kỳ ' + t.id) : '—');

const ICON_EMPTY = '<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';
const ICON_ERR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
const empty = (text) => `<div class="empty">${ICON_EMPTY}<div>${esc(text)}</div></div>`;

let toastTimer;
function toast(text, type = 'ok') {
  const t = $('toast');
  t.textContent = text;
  t.style.background = type === 'ok' ? 'var(--ok)' : 'var(--err)';
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 3200);
}

function askConfirm(text, okLabel) {
  return new Promise((resolve) => {
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    $('confirmOverlay').classList.add('show');
    const done = (v) => {
      $('confirmOverlay').classList.remove('show');
      $('confirmOk').onclick = null;
      $('confirmCancel').onclick = null;
      resolve(v);
    };
    $('confirmOk').onclick = () => done(true);
    $('confirmCancel').onclick = () => done(false);
  });
}

async function api(path, options) {
  const res = await fetch(API + '/student-portal/' + sid() + path, options);
  let data = null;
  try { data = await res.json(); } catch (_) {}
  $('raw').textContent = JSON.stringify(data, null, 2);
  if (!res.ok) {
    const m = data && data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Lỗi ' + res.status;
    throw new Error(m);
  }
  return data;
}

function table(headers, rows, centerCols = []) {
  if (!rows.length) return empty('Chưa có dữ liệu.');
  const cls = (i) => (centerCols.includes(i) ? ' class="c"' : '');
  return `<div class="tbl-wrap"><table>
    <thead><tr>${headers.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

const gradeBadge = (l) => {
  if (!l) return '<span class="badge b-mut">—</span>';
  const cls = l.startsWith('A') ? 'b-ok' : l.startsWith('B') ? 'b-pri' : l === 'F' ? 'b-err' : 'b-warn';
  return `<span class="grade ${cls}">${esc(l)}</span>`;
};

// ---------- Người dùng đang xem (sidebar + topbar) ----------
function setWho(s) {
  const ini = s?.fullName ? initials(s.fullName) : 'SV';
  $('sideAvatar').textContent = ini;
  $('topAvatar').textContent = ini;
  $('sideName').textContent = s?.fullName || 'Sinh viên';
  $('topName').textContent = s?.fullName || 'Sinh viên';
  $('topCode').textContent = s ? s.studentCode || 'Student' : 'Không tìm thấy';
  $('sideCode').textContent = s ? s.studentCode || 'Sinh viên' : 'Không tìm thấy';
}
async function refreshWho() {
  try {
    const res = await fetch(API + '/student-portal/' + sid() + '/profile');
    setWho(res.ok ? await res.json() : null);
  } catch (_) { setWho(null); }
}

// ---------- Từng tab ----------
const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const STATUS = {
  studying:  { label: 'Đang học',      cls: 'b-ok' },
  reserved:  { label: 'Bảo lưu',       cls: 'b-warn' },
  dropped:   { label: 'Thôi học',      cls: 'b-err' },
  graduated: { label: 'Đã tốt nghiệp', cls: 'b-pri' },
};
const statusBadge = (st) => {
  if (!st) return '<span class="badge b-mut">Chưa có</span>';
  const m = STATUS[st.value] || { label: st.value, cls: 'b-mut' };
  return `<span class="badge ${m.cls}">${esc(m.label)}</span>`;
};

const QICON = {
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  reg: '<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
  pulse: '<svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};

const views = {
  async home() {
    const [s, t, tt] = await Promise.all([
      api('/profile'),
      api('/transcript').catch(() => null),
      api('/timetable?termId=' + tid()).catch(() => []),
    ]);
    setWho(s);

    const js = new Date().getDay();
    const dow = js === 0 ? 8 : js + 1;
    const today = tt.filter((c) => Number(c.dayOfWeek) === dow);
    const credits = tt.reduce((sum, c) => sum + (c.subject?.credits || 0), 0);
    const gpa = t ? Number(t.cumulativeGpa) || 0 : 0;
    const gpaPct = Math.min(100, Math.round((gpa / 4) * 100));
    const passed = t ? t.passedCredits : 0;
    const counted = t ? t.totalCredits : 0;
    const credPct = counted ? Math.round((passed / counted) * 100) : 0;

    const q = (href, color, icon, small, title, desc) => `
      <a class="qcard" href="${href}">
        <div class="qicon" style="background:${color}">${QICON[icon]}</div>
        <div><small>${small}</small><b>${title}</b><span>${desc}</span></div>
      </a>`;

    const todayHtml = today.length
      ? today.map((c) => `<div class="today-item">
          <span class="t">${periods(c)}</span>
          <div><b>${esc(c.subject?.subjectName)}</b><span class="sub">${c.room ? 'Phòng ' + esc(c.room) : 'Chưa có phòng'} · ${esc(c.sectionCode)}</span></div>
        </div>`).join('')
      : '<div class="cap-note" style="padding:20px 0">Hôm nay bạn không có lớp nào.</div>';

    return `
      <div class="banner">
        <h2>Chào ${esc(s.fullName)} 👋</h2>
        <p>Chúc bạn một ngày học tập hiệu quả</p>
        <span class="chip">Học kỳ hiện tại: ${esc(tid())}</span>
      </div>

      <div class="quick">
        ${q('#timetable', '#2563eb', 'cal', 'Tra cứu', 'Thời khóa biểu', 'TKB các lớp đã đăng ký')}
        ${q('#register', '#0891b2', 'reg', 'Thực hiện', 'Đăng ký học phần', 'Chọn lớp đang mở')}
        ${q('#grades', '#9333ea', 'pulse', 'Tra cứu', 'Kết quả học tập', 'Xem điểm các học phần')}
        ${q('#attendance', '#d97706', 'clock', 'Theo dõi', 'Chuyên cần', 'Số buổi vắng từng môn')}
      </div>

      <div class="home-grid">
        <div class="card">
          <h3><i></i>GPA hiện tại</h3>
          <div class="ring" style="--p:${gpaPct}"><b>${gpa.toFixed(2)}</b></div>
          <div class="cap-note">Hệ 4 · Xếp loại: <b>${esc(t?.classification || '—')}</b></div>
        </div>
        <div class="card">
          <h3><i></i>Tín chỉ tích lũy</h3>
          <div class="ring" style="--p:${credPct}"><b>${esc(passed)}</b></div>
          <div class="cap-note">Đạt ${esc(passed)} / ${esc(counted)} tín chỉ đã tính điểm</div>
        </div>
        <div class="card">
          <h3><i></i>Học kỳ này</h3>
          <div class="big">${tt.length}</div>
          <div class="cap-note">lớp học phần · ${credits} tín chỉ</div>
        </div>
      </div>

      <div class="card">
        <h3><i></i>Lịch học hôm nay (${dayName(dow)})</h3>
        ${todayHtml}
      </div>`;
  },

  async profile() {
    const s = await api('/profile');
    setWho(s);
    const c = s.class;
    const st = s.status;
    const item = (k, v) => `<div><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
    return `
      <div class="hero">
        <div class="avatar-lg">${esc(initials(s.fullName))}</div>
        <div class="hero-info"><h2>${esc(s.fullName)}</h2><p>${esc(s.studentCode)}${c ? ' · ' + esc(c.className) : ''}</p></div>
        <button class="primary" onclick="openEdit()">Chỉnh sửa thông tin</button>
      </div>
      <div class="info">
        ${item('Mã sinh viên', esc(s.studentCode))}
        ${item('Ngày sinh', esc(fmtDate(s.dateOfBirth)))}
        ${item('Giới tính', esc(GENDER[s.gender] || s.gender))}
        ${item('Quê quán', esc(s.hometown))}
        ${item('Email', esc(s.email))}
        ${item('Số điện thoại', esc(s.phone))}
        ${item('Lớp', c ? `${esc(c.className)}<span class="sub">${esc(c.classCode)}</span>` : '—')}
        ${item('Ngành', esc(c?.majorName))}
        ${item('Niên khóa', esc(c?.academicYear))}
        ${item('Trạng thái học tập', statusBadge(st) + (st ? `<span class="sub">Từ ${esc(fmtDate(st.effectiveDate))}${st.reason ? ' · ' + esc(st.reason) : ''}</span>` : ''))}
      </div>`;
  },

  async register() {
    const [open, mine, prof] = await Promise.all([
      api('/sections/open?termId=' + tid()),
      api('/timetable?termId=' + tid()),
      api('/profile'),
    ]);
    const mineMap = new Map(mine.map((c) => [String(c.id), c.enrollmentId]));
    const credits = mine.reduce((sum, c) => sum + (c.subject?.credits || 0), 0);

    const stats = `
      <div class="stats">
        <div class="stat pri"><div class="l">Lớp đã đăng ký</div><div class="n">${mine.length}</div></div>
        <div class="stat"><div class="l">Tổng tín chỉ</div><div class="n">${credits}</div></div>
        <div class="stat"><div class="l">Lớp đang mở</div><div class="n">${open.length}</div></div>
      </div>`;

    const rows = open.map((c) => {
      const isMine = mineMap.has(String(c.id));
      const full = c.enrolledCount >= c.maxStudents;
      const pct = c.maxStudents ? Math.min(100, Math.round((c.enrolledCount / c.maxStudents) * 100)) : 0;
      const barCls = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
      const action = isMine
        ? `<span class="badge b-ok">Đã đăng ký</span> <button class="sm danger" onclick="cancelCourse(${Number(mineMap.get(String(c.id)))})">Hủy</button>`
        : full
          ? '<span class="badge b-err">Đã đầy</span>'
          : `<button class="sm primary" onclick="registerCourse(${Number(c.id)})">Đăng ký</button>`;
      return [
        `<b>${esc(c.sectionCode)}</b>`,
        `${esc(c.subject?.subjectName)}<span class="sub">${esc(c.subject?.subjectCode)} · ${esc(c.subject?.credits)} tín chỉ · ${c.subject?.majorName ? esc(c.subject.majorName) : 'Môn chung'}</span>`,
        `${dayName(c.dayOfWeek)}<span class="sub">${periods(c)}</span>`,
        esc(c.room),
        `<div class="cap"><div class="track"><i class="${barCls}" style="width:${pct}%"></i></div><span>${esc(c.enrolledCount)}/${esc(c.maxStudents)}</span></div>`,
        action,
      ];
    });
    const major = prof.class?.majorName;
    const note = `<div class="sub" style="margin:-6px 0 12px">Hiển thị các lớp thuộc ngành ${major ? '<b>' + esc(major) + '</b>' : 'của bạn'} và các môn chung.</div>`;
    return stats + `<div class="sec-title"><h3>Lớp học phần đang mở</h3></div>` + note + table(['Mã lớp', 'Môn học', 'Lịch học', 'Phòng', 'Sĩ số', ''], rows);
  },

  async timetable() {
    const list = await api('/timetable?termId=' + tid());
    if (!list.length) return empty('Bạn chưa đăng ký lớp nào trong học kỳ này.');

    const days = [2, 3, 4, 5, 6, 7, 8];
    const slot = (c) => {
      const color = PALETTE[Number(c.subject?.id || c.subjectId || 0) % PALETTE.length];
      return `<div class="slot" style="border-left-color:${color}">
        <b>${esc(c.subject?.subjectName)}</b>
        <span>${periods(c)}</span>
        <span>${c.room ? 'Phòng ' + esc(c.room) : 'Chưa có phòng'} · ${esc(c.sectionCode)}</span>
      </div>`;
    };
    const board = days.map((d) => {
      const items = list.filter((c) => Number(c.dayOfWeek) === d);
      return `<div class="day ${items.length ? 'has' : ''}"><h4>${dayName(d)}</h4>${items.length ? items.map(slot).join('') : '<div class="none">Không có lớp</div>'}</div>`;
    }).join('');

    const unscheduled = list.filter((c) => c.dayOfWeek == null);
    return `<div class="week">${board}</div>` + (unscheduled.length
      ? `<h3 style="margin-top:20px">Chưa xếp lịch</h3><div class="week">${unscheduled.map(slot).join('')}</div>` : '');
  },

  async grades() {
    const list = await api('/grades');
    return table(
      ['Môn học', 'Học kỳ', 'Chuyên cần', 'Giữa kỳ', 'Cuối kỳ', 'Tổng kết', 'Điểm chữ', 'Kết quả'],
      list.map((g) => {
        const sec = g.enrollment?.section;
        const result = g.isPassed == null ? '<span class="badge b-mut">Chưa có</span>'
          : g.isPassed ? '<span class="badge b-ok">Đạt</span>' : '<span class="badge b-err">Không đạt</span>';
        return [
          `${esc(sec?.subject?.subjectName)}<span class="sub">${esc(sec?.subject?.subjectCode)} · ${esc(sec?.subject?.credits)} tín chỉ</span>`,
          termLabel(sec?.term),
          f1(g.attendanceScore), f1(g.midtermScore), f1(g.finalScore),
          `<b>${f1(g.totalScore)}</b>`, gradeBadge(g.letterGrade), result,
        ];
      }),
      [2, 3, 4, 5, 6, 7]
    );
  },

  async transcript() {
    const t = await api('/transcript');
    const stats = `
      <div class="stats">
        <div class="stat pri"><div class="l">GPA tích lũy (hệ 4)</div><div class="n">${esc(t.cumulativeGpa)}</div></div>
        <div class="stat"><div class="l">Xếp loại học lực</div><div class="n sm">${esc(t.classification)}</div></div>
        <div class="stat"><div class="l">Tín chỉ đã tính điểm</div><div class="n">${esc(t.totalCredits)}</div></div>
        <div class="stat"><div class="l">Tín chỉ đạt</div><div class="n">${esc(t.passedCredits)}</div></div>
      </div>`;
    const rows = t.terms.map((x) => {
      const pct = Math.min(100, Math.round((x.gpa / 4) * 100));
      return [
        `<b>${esc(x.term)}</b>`, esc(x.credits),
        `<div class="cap"><div class="track"><i style="width:${pct}%"></i></div><span><b>${esc(x.gpa)}</b> / 4</span></div>`,
      ];
    });
    return stats + `<div class="sec-title"><h3>GPA theo học kỳ</h3></div>` + table(['Học kỳ', 'Số tín chỉ', 'GPA học kỳ'], rows);
  },

  async attendance() {
    const list = await api('/attendance?termId=' + tid());
    if (!list.length) return empty('Chưa có dữ liệu chuyên cần trong học kỳ này.');
    const label = { absent: 'Vắng', late: 'Trễ', excused: 'Vắng có phép' };
    const cls = { absent: 'b-err', late: 'b-warn', excused: 'b-pri' };
    const seg = (n, total, color) => (n ? `<i style="width:${(n / total) * 100}%;background:${color}"></i>` : '');

    return list.map((s) => {
      const rateCls = s.absentRate >= 20 ? 'b-err' : s.absentRate >= 10 ? 'b-warn' : 'b-ok';
      return `<div class="att">
        <div class="att-head">
          <h3>${esc(s.subject)}</h3>
          <span class="badge ${rateCls}">Vắng ${esc(s.absentRate)}% · ${esc(s.absent)}/${esc(s.total)} buổi</span>
        </div>
        <div class="stack">${seg(s.present, s.total, '#16a34a')}${seg(s.late, s.total, '#d97706')}${seg(s.excused, s.total, '#2563eb')}${seg(s.absent, s.total, '#dc2626')}</div>
        <div class="legend">
          <span><i class="dot" style="background:#16a34a"></i>Có mặt<b>${esc(s.present)}</b></span>
          <span><i class="dot" style="background:#d97706"></i>Trễ<b>${esc(s.late)}</b></span>
          <span><i class="dot" style="background:#2563eb"></i>Có phép<b>${esc(s.excused)}</b></span>
          <span><i class="dot" style="background:#dc2626"></i>Vắng<b>${esc(s.absent)}</b></span>
        </div>
        ${s.details.length
          ? table(['Ngày', 'Trạng thái', 'Ghi chú'], s.details.map((d) => [fmtDate(d.date), `<span class="badge ${cls[d.status] || 'b-mut'}">${esc(label[d.status] || d.status)}</span>`, esc(d.note || '')]))
          : '<div class="sub">Không có buổi vắng hoặc trễ.</div>'}
      </div>`;
    }).join('');
  },
};

// ---------- Hành động ----------
async function registerCourse(classSectionId) {
  try {
    await api('/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classSectionId }),
    });
    await render('register');
    toast('Đăng ký thành công');
  } catch (e) { toast(e.message, 'err'); }
}

async function cancelCourse(enrollmentId) {
  if (!(await askConfirm('Bạn chắc chắn muốn hủy đăng ký lớp học phần này?', 'Hủy đăng ký'))) return;
  try {
    await api('/enrollments/' + enrollmentId, { method: 'DELETE' });
    await render('register');
    toast('Đã hủy đăng ký');
  } catch (e) { toast(e.message, 'err'); }
}

// ----- Chỉnh sửa hồ sơ cá nhân -----
async function openEdit() {
  try {
    const s = await api('/profile');
    $('fDob').value = (s.dateOfBirth || '').slice(0, 10);
    $('fGender').value = s.gender || '';
    $('fEmail').value = s.email || '';
    $('fPhone').value = s.phone || '';
    $('fHometown').value = s.hometown || '';
    $('editOverlay').classList.add('show');
  } catch (e) { toast(e.message, 'err'); }
}

function closeEdit() { $('editOverlay').classList.remove('show'); }

async function saveProfile(ev) {
  ev.preventDefault();
  const email = $('fEmail').value.trim();
  const dob = $('fDob').value;
  if (!email) return toast('Email không được để trống', 'err');
  if (dob && dob > new Date().toLocaleDateString('en-CA')) {
    return toast('Ngày sinh không được nằm trong tương lai', 'err');
  }

  const body = { email, hometown: $('fHometown').value.trim() };
  // Trường để trống thì không gửi, tránh bị validator báo lỗi
  if (dob) body.dateOfBirth = dob;
  if ($('fGender').value) body.gender = $('fGender').value;
  if ($('fPhone').value.trim()) body.phone = $('fPhone').value.trim();

  $('saveBtn').disabled = true;
  try {
    await api('/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    closeEdit();
    await Promise.all([refreshWho(), render('profile')]);
    toast('Đã cập nhật thông tin');
  } catch (e) { toast(e.message, 'err'); }
  finally { $('saveBtn').disabled = false; }
}

async function render(key) {
  current = key;
  document.querySelectorAll('.nav-item[data-key]').forEach((a) => a.classList.toggle('active', a.dataset.key === key));
  const pg = PAGES[key];
  $('pageTitle').textContent = pg.title;
  $('pageDesc').textContent = pg.desc;
  $('crumbPage').textContent = pg.title;
  $('pageHead').classList.toggle('hide', !!pg.home);
  $('content').classList.toggle('panel', !pg.home);   // trang chủ không bọc khung trắng
  document.title = pg.title + ' - Cổng sinh viên';
  $('content').innerHTML = '<div class="loading"><div class="spin"></div>Đang tải...</div>';
  try {
    $('content').innerHTML = await views[key]();
  } catch (e) {
    $('content').innerHTML = `<div class="empty err">${ICON_ERR}<div>${esc(e.message)}</div></div>`;
  }
}

async function load() {
  const btn = $('loadBtn');
  btn.disabled = true;
  await Promise.all([refreshWho(), render(current)]);
  btn.disabled = false;
}

// ----- Menu người dùng góc phải -----
$('userBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('userMenu').classList.toggle('show');
});
document.addEventListener('click', () => $('userMenu').classList.remove('show'));
$('userMenu').addEventListener('click', () => $('userMenu').classList.remove('show'));

// Bấm menu bên trái -> đổi #hash -> hiện trang tương ứng (có thể F5 hoặc gửi link thẳng tới 1 mục)
window.addEventListener('hashchange', () => render(routeKey()));
load();