const API = '/accounts';
const ROLE_LABEL = { student: 'Sinh viên', advisor: 'Giảng viên', staff: 'Nhân viên', admin: 'Quản trị viên' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (s) => { const d = String(s || '').slice(0, 10); return d ? d.split('-').reverse().join('/') : ''; };

let state = { page: 1, limit: 10, totalPages: 1, total: 0 };
let rows = [];

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

function toast(msg, ok = true) {
  const t = $('toast');
  t.textContent = msg;
  t.style.background = ok ? 'var(--ok)' : 'var(--err)';
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.style.display = 'none'), 3500);
}

async function load() {
  const p = new URLSearchParams({ page: state.page, limit: state.limit });
  if ($('q').value.trim()) p.set('q', $('q').value.trim());
  if ($('fRole').value) p.set('role', $('fRole').value);
  if ($('fStatus').value) p.set('status', $('fStatus').value);
  try {
    const res = await api(`${API}?${p}`);
    rows = res.data;
    state.total = res.meta.total;
    state.totalPages = res.meta.totalPages;
    render();
  } catch (e) { toast(e.message, false); }
}

function render() {
  const me = Auth.user();
  $('tbody').innerHTML = rows.map((u) => {
    const self = me && me.username === u.username;
    return `<tr>
      <td><span class="code">${esc(u.username)}</span></td>
      <td>${esc(u.fullName) || '—'}<span class="sub">${esc(u.email || '')}</span></td>
      <td><span class="badge r-${esc(u.role)}">${esc(ROLE_LABEL[u.role] || u.role)}</span></td>
      <td><span class="badge ${u.isActive ? 's-on' : 's-off'}">${u.isActive ? 'Hoạt động' : 'Đã khóa'}</span></td>
      <td>${fmtDate(u.createdAt)}</td>
      <td><div class="actions">
        <button class="sm" onclick="resetPwd(${u.id})">Đặt lại MK</button>
        ${self ? '' : (u.isActive
          ? `<button class="sm danger" onclick="setActive(${u.id}, false)">Khóa</button>`
          : `<button class="sm" onclick="setActive(${u.id}, true)">Mở khóa</button>`)}
      </div></td>
    </tr>`;
  }).join('');

  $('empty').style.display = rows.length ? 'none' : 'block';
  const start = (state.page - 1) * state.limit;
  $('info').textContent = `Hiển thị ${rows.length ? start + 1 : 0} - ${start + rows.length} trong tổng số ${state.total} tài khoản`;

  const tp = state.totalPages;
  const b = (label, page, dis = false, on = false) =>
    `<button class="sm ${on ? 'primary' : ''}" ${dis ? 'disabled' : ''} data-page="${page}">${label}</button>`;
  let html = '';
  if (tp > 1) {
    html = b('‹', state.page - 1, state.page === 1);
    for (let i = Math.max(1, state.page - 2); i <= Math.min(tp, state.page + 2); i++) html += b(i, i, false, i === state.page);
    html += b('›', state.page + 1, state.page === tp);
  }
  $('pg').innerHTML = html;
  $('pg').querySelectorAll('button[data-page]').forEach((btn) =>
    btn.addEventListener('click', () => { state.page = Number(btn.dataset.page); load(); }));
}

window.setActive = async (id, isActive) => {
  const u = rows.find((r) => r.id === id);
  if (!confirm(`${isActive ? 'Mở khóa' : 'Khóa'} tài khoản ${u ? u.username : ''}?`)) return;
  try {
    const r = await api(`${API}/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
    toast(r.message);
    load();
  } catch (e) { toast(e.message, false); }
};

window.resetPwd = async (id) => {
  const u = rows.find((r) => r.id === id);
  if (!confirm(`Đặt lại mật khẩu của ${u ? u.username : 'tài khoản này'} về mặc định?`)) return;
  try {
    const r = await api(`${API}/${id}/reset-password`, { method: 'POST' });
    $('pwdUser').textContent = r.username;
    $('pwdValue').textContent = r.newPassword;
    $('mPwd').classList.add('show');
  } catch (e) { toast(e.message, false); }
};

$('btnProvision').addEventListener('click', async () => {
  if (!confirm('Tạo tài khoản cho tất cả sinh viên và giảng viên chưa có tài khoản?')) return;
  $('btnProvision').disabled = true;
  try {
    const r = await api(`${API}/provision`, { method: 'POST' });
    toast(`Đã tạo ${r.students} tài khoản sinh viên, ${r.advisors} tài khoản giảng viên`);
    state.page = 1;
    load();
  } catch (e) { toast(e.message, false); }
  finally { $('btnProvision').disabled = false; }
});

document.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => b.closest('.overlay').classList.remove('show')));

let timer;
$('q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.page = 1; load(); }, 350); });
['fRole', 'fStatus'].forEach((id) => $(id).addEventListener('change', () => { state.page = 1; load(); }));

load();