/* ===== Ô ngày dd/mm/yyyy (thay cho ô ngày mặc định của trình duyệt) ===== */
/* vn-date.js — biến mọi <input type="date"> thành ô nhập dd/mm/yyyy (có nút lịch).
   Code cũ vẫn đọc/ghi input.value dạng yyyy-mm-dd như bình thường. */
(function () {
  if (window.__vnDate) return; window.__vnDate = true;
  const getV = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  const css = document.createElement('style');
  css.textContent = `
  .vn-date{position:relative;display:block;width:100%}
  .vn-date>input.vn-txt{width:100%;padding-right:42px;box-sizing:border-box}
  .vn-date>input.vn-native{position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0}
  .vn-date>button.vn-cal{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;padding:0;border:0;border-radius:8px;background:transparent;color:#64748b;cursor:pointer;display:grid;place-items:center}
  .vn-date>button.vn-cal:hover{background:#eef2ff;color:#2563eb}
  .vn-date>button.vn-cal svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`;
  document.head.appendChild(css);

  const iso2vn = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  function vn2iso(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3], dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  function enhance(el) {
    if (el.dataset.vn) return;
    el.dataset.vn = '1';

    const wrap = document.createElement('div'); wrap.className = 'vn-date';
    const txt = document.createElement('input');
    txt.type = 'text'; txt.className = (el.className ? el.className + ' ' : '') + 'vn-txt';
    txt.placeholder = 'dd/mm/yyyy'; txt.inputMode = 'numeric'; txt.maxLength = 10; txt.autocomplete = 'off';
    txt.required = el.required; el.required = false;
    if (el.disabled) txt.disabled = true;

    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vn-cal'; btn.title = 'Chọn ngày'; btn.setAttribute('aria-label', 'Chọn ngày');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

    el.parentNode.insertBefore(wrap, el);
    wrap.append(txt, el, btn);
    el.classList.add('vn-native'); el.tabIndex = -1;

    const sync = () => { txt.value = iso2vn(getV.get.call(el)); txt.setCustomValidity(''); };
    // code cũ gán el.value = '2005-07-18' -> ô hiển thị tự cập nhật
    Object.defineProperty(el, 'value', {
      get() { return getV.get.call(el); },
      set(v) { getV.set.call(el, v); sync(); },
    });
    const fire = () => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };

    txt.addEventListener('input', () => {
      const d = txt.value.replace(/\D/g, '').slice(0, 8);
      let s = d;
      if (d.length > 4) s = d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
      else if (d.length > 2) s = d.slice(0, 2) + '/' + d.slice(2);
      txt.value = s;
      const iso = s.length === 10 ? vn2iso(s) : null;
      getV.set.call(el, iso || '');
      txt.setCustomValidity(s && !iso ? 'Ngày không hợp lệ, nhập theo dạng dd/mm/yyyy' : '');
      fire();
    });
    txt.addEventListener('blur', () => { if (txt.value && txt.value.length < 10) txt.setCustomValidity('Nhập đủ ngày theo dạng dd/mm/yyyy'); });

    // chọn từ lịch
    el.addEventListener('change', () => { const v = iso2vn(getV.get.call(el)); if (v !== txt.value && v) txt.value = v; });
    btn.addEventListener('click', () => {
      if (txt.disabled) return;
      try { if (!getV.get.call(el)) { const i = vn2iso(txt.value); if (i) getV.set.call(el, i); } el.showPicker(); } catch (e) { txt.focus(); }
    });

    if (el.form) el.form.addEventListener('reset', () => setTimeout(sync, 0));
    sync();
  }

  const run = () => document.querySelectorAll('input[type="date"]').forEach(enhance);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();


/* ===== Quản lý thông báo sinh viên ===== */
const API = '/announcements';
const CLASSES_API = '/students/classes-options';
const CAT = {
  general: { label: 'Thông báo chung', bg: '#eff6ff', fg: '#2563eb' },
  holiday: { label: 'Lịch nghỉ',       bg: '#fff7ed', fg: '#c2410c' },
  exam:    { label: 'Lịch thi',        bg: '#f5f3ff', fg: '#7c3aed' },
  tuition: { label: 'Học phí',         bg: '#f0fdf4', fg: '#15803d' },
  urgent:  { label: 'Khẩn',            bg: '#fef2f2', fg: '#dc2626' },
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
const fmtDT = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || ''); return m ? `${m[4]}:${m[5]} ${m[3]}/${m[2]}/${m[1]}` : ''; };
const addDay = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
const pad = (n) => String(n).padStart(2, '0');

let rows = [];
let classes = [];
let editing = null;      // bản ghi đang sửa

function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = ok ? '#16a34a' : '#dc2626';
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.style.display = 'none'), 3500);
}

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = data && data.message ? (Array.isArray(data.message) ? data.message.join('\n') : data.message) : `Lỗi ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const ICON = {
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>',
};

/* ---------- Danh sách ---------- */
function filtered() {
  const q = $('q').value.trim().toLowerCase();
  const cat = $('fCat').value, st = $('fStatus').value;
  return rows.filter((r) =>
    (!cat || r.category === cat) && (!st || r.status === st) &&
    (!q || `${r.title} ${r.content}`.toLowerCase().includes(q)));
}

function render() {
  $('stats').innerHTML = [
    ['Tổng thông báo', rows.length],
    ['Đã gửi', rows.filter((r) => r.status === 'sent').length],
    ['Đang hẹn giờ', rows.filter((r) => r.status === 'scheduled').length],
    ['Đang ghim', rows.filter((r) => r.isPinned).length],
  ].map(([l, n]) => `<div class="an-stat"><span>${l}</span><b>${n}</b></div>`).join('');

  const list = filtered();
  $('empty').style.display = list.length ? 'none' : 'block';
  $('tbody').innerHTML = list.map((r) => {
    const c = CAT[r.category] || CAT.general;
    const cls = classes.find((x) => String(x.id) === String(r.classId));
    const target = r.classId ? esc(cls ? cls.classCode : 'Lớp #' + r.classId) : 'Toàn trường';
    const when = r.status === 'scheduled'
      ? `<span class="an-tag an-wait">Hẹn giờ</span><div style="font-size:13px;margin-top:4px">${fmtDT(r.publishAt)}</div>`
      : `<span class="an-tag an-ok">Đã gửi</span><div style="font-size:13px;margin-top:4px">${fmtDT(r.publishAt)}</div>`;
    const holiday = r.eventStart ? ` · nghỉ ${fmtDate(r.eventStart)}${r.eventEnd && r.eventEnd !== r.eventStart ? ' – ' + fmtDate(r.eventEnd) : ''}` : '';
    return `<tr>
      <td><span class="an-title">${r.isPinned ? '<span class="an-pin">📌</span>' : ''}${esc(r.title)}</span>
          <span class="an-snip">${esc(r.content)}${esc(holiday)}</span></td>
      <td><span class="an-tag" style="background:${c.bg};color:${c.fg}">${c.label}</span></td>
      <td>${target}</td>
      <td>${when}</td>
      <td>${r.status === 'scheduled' ? '—' : r.readCount}</td>
      <td><div class="an-act">
        <button class="an-ib" title="Sửa" onclick="openEdit(${Number(r.id)})">${ICON.edit}</button>
        <button class="an-ib del" title="Xóa" onclick="removeAnn(${Number(r.id)})">${ICON.del}</button>
      </div></td></tr>`;
  }).join('');
}

async function load() {
  try { rows = await api(API + '/admin'); render(); }
  catch (e) { toast(e.message, false); $('empty').style.display = 'block'; $('empty').textContent = e.message; }
}

async function loadClasses() {
  try {
    const res = await api(CLASSES_API);
    classes = Array.isArray(res) ? res : (res.data || []);
  } catch (_) { classes = []; }
  $('aClass').innerHTML = '<option value="">Toàn trường</option>' +
    classes.map((c) => `<option value="${esc(c.id)}">${esc(c.classCode)} - ${esc(c.className)}</option>`).join('');
}

/* ---------- Form ---------- */
const sendMode = () => document.querySelector('input[name="sendMode"]:checked').value;
const dateText = (id) => $(id).parentNode.querySelector('.vn-txt')?.value || '';   // chữ người dùng gõ

function syncForm() {
  $('rowHoliday').style.display = $('aCat').value === 'holiday' ? 'grid' : 'none';
  $('rowLater').classList.toggle('show', sendMode() === 'later');
  $('btnSave').textContent = editing && editing.status === 'sent' ? 'Lưu thay đổi'
    : sendMode() === 'later' ? 'Lưu & hẹn giờ' : 'Gửi thông báo';
}

function openForm(rec) {
  editing = rec || null;
  $('form').reset();
  $('formTitle').textContent = rec ? 'Sửa thông báo' : 'Soạn thông báo';
  $('aHour').value = '07'; $('aMin').value = '00';
  // thông báo đã gửi thì không đổi giờ gửi nữa
  $('rowSend').style.display = rec && rec.status === 'sent' ? 'none' : 'block';
  if (rec) {
    $('aTitle').value = rec.title;
    $('aCat').value = rec.category;
    $('aClass').value = rec.classId || '';
    $('aContent').value = rec.content;
    $('aStart').value = rec.eventStart || '';
    $('aEnd').value = rec.eventEnd || '';
    $('aPin').checked = !!rec.isPinned;
    if (rec.status === 'scheduled') {
      document.querySelector('input[name="sendMode"][value="later"]').checked = true;
      $('aDate').value = rec.publishAt.slice(0, 10);
      $('aHour').value = rec.publishAt.slice(11, 13);
      $('aMin').value = rec.publishAt.slice(14, 16);
    }
  }
  syncForm();
  $('mForm').classList.add('show');
}
window.openEdit = (id) => { const r = rows.find((x) => Number(x.id) === id); if (r) openForm(r); };
const closeForm = () => $('mForm').classList.remove('show');

$('btnAdd').addEventListener('click', () => openForm(null));
$('btnCancel').addEventListener('click', closeForm);
$('mForm').addEventListener('mousedown', (e) => { if (e.target === $('mForm')) closeForm(); });
$('aCat').addEventListener('change', syncForm);
document.querySelectorAll('input[name="sendMode"]').forEach((r) => r.addEventListener('change', syncForm));

// Nội dung mẫu cho thông báo nghỉ
$('btnTpl').addEventListener('click', () => {
  const s = $('aStart').value, e = $('aEnd').value || s;
  if (!s) return toast('Hãy nhập "Nghỉ từ ngày" trước', false);
  const reason = $('aReason').value.trim();
  const range = s === e ? `ngày ${fmtDate(s)}` : `từ ngày ${fmtDate(s)} đến hết ngày ${fmtDate(e)}`;
  if (!$('aTitle').value.trim()) $('aTitle').value = reason ? `Thông báo nghỉ ${reason}` : 'Thông báo lịch nghỉ học';
  $('aContent').value =
    `Nhà trường thông báo: sinh viên được nghỉ học${reason ? ' dịp ' + reason : ''} ${range}.\n` +
    `Sinh viên đi học trở lại từ ngày ${fmtDate(addDay(e, 1))}.\n` +
    `Mọi thắc mắc vui lòng liên hệ phòng Đào tạo.`;
});

$('form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const title = $('aTitle').value.trim(), content = $('aContent').value.trim();
  const cat = $('aCat').value;
  if (!title) return toast('Vui lòng nhập tiêu đề', false);
  if (!content) return toast('Vui lòng nhập nội dung', false);

  const body = { title, content, category: cat, classId: $('aClass').value || null, isPinned: $('aPin').checked };
  if (cat === 'holiday') {
    if (dateText('aStart') && !$('aStart').value) return toast('Ngày bắt đầu nghỉ chưa hợp lệ (dd/mm/yyyy)', false);
    if (dateText('aEnd') && !$('aEnd').value) return toast('Ngày kết thúc nghỉ chưa hợp lệ (dd/mm/yyyy)', false);
    if (!$('aStart').value) return toast('Vui lòng nhập ngày bắt đầu nghỉ', false);
    body.eventStart = $('aStart').value;
    body.eventEnd = $('aEnd').value || null;
    if (body.eventEnd && body.eventEnd < body.eventStart) return toast('Ngày kết thúc phải sau ngày bắt đầu', false);
  } else { body.eventStart = null; body.eventEnd = null; }

  const alreadySent = editing && editing.status === 'sent';
  if (!alreadySent) {
    if (sendMode() === 'later') {
      if (dateText('aDate') && !$('aDate').value) return toast('Ngày gửi chưa hợp lệ (dd/mm/yyyy)', false);
      if (!$('aDate').value) return toast('Vui lòng chọn ngày hẹn gửi', false);
      const at = `${$('aDate').value} ${$('aHour').value}:${$('aMin').value}`;
      if (new Date(at.replace(' ', 'T')) <= new Date()) return toast('Giờ hẹn gửi phải nằm trong tương lai', false);
      body.publishAt = at;
    } else if (editing) body.sendNow = true;
  }

  $('btnSave').disabled = true;
  try {
    if (editing) await api(`${API}/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await api(API, { method: 'POST', body: JSON.stringify(body) });
    toast(editing ? 'Đã cập nhật thông báo' : (body.publishAt ? 'Đã hẹn giờ gửi thông báo' : 'Đã gửi thông báo tới sinh viên'));
    closeForm();
    load();
  } catch (e) { toast(e.message, false); }
  finally { $('btnSave').disabled = false; }
});

window.removeAnn = async (id) => {
  const r = rows.find((x) => Number(x.id) === id);
  if (!confirm(`Xóa thông báo "${r ? r.title : id}"? Sinh viên sẽ không còn thấy thông báo này.`)) return;
  try { await api(`${API}/${id}`, { method: 'DELETE' }); toast('Đã xóa thông báo'); load(); }
  catch (e) { toast(e.message, false); }
};

/* ---------- Khởi động ---------- */
$('aCat').innerHTML = Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('fCat').innerHTML += Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
$('aHour').innerHTML = Array.from({ length: 24 }, (_, i) => `<option>${pad(i)}</option>`).join('');
$('aMin').innerHTML = Array.from({ length: 12 }, (_, i) => `<option>${pad(i * 5)}</option>`).join('');
['q', 'fCat', 'fStatus'].forEach((id) => $(id).addEventListener('input', render));
loadClasses().then(load);