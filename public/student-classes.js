const API = '/student-classes';
let classes = [];
let advisorsMap = new Map(); // id lớp -> { name, code }
let selectedId = null;
let editingId = null;
let available = [];

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(msg || 'Có lỗi xảy ra');
  }
  return data;
}

// ===== CVHT đang phụ trách (cùng API với trang Quản lý khoa) =====
async function fetchActiveAdvisors(limit) {
  const map = new Map();
  let got = 0;
  for (let page = 1; page <= 100; page++) {
    const { items, total } = await api(`/advisor-assignments?status=active&limit=${limit}&page=${page}`);
    items.forEach((r) => map.set(String(r.studentClassId), { name: r.employeeName, code: r.employeeCode }));
    got += items.length;
    if (!items.length || got >= total) break;
  }
  return map;
}

async function loadAdvisors() {
  try { return await fetchActiveAdvisors(50); }
  catch (_) {
    try { return await fetchActiveAdvisors(10); }
    catch (__) { return new Map(); }
  }
}

// ===== Danh sách lớp =====
async function loadClasses() {
  classes = await api(API);
  renderStats();
  renderYearOptions();
  renderClasses();
}

function renderStats() {
  const active = classes.filter((c) => c.isActive).length;
  $('statTotal').textContent = classes.length;
  $('statActive').textContent = active;
  $('statActiveRate').textContent = classes.length ? `${((active / classes.length) * 100).toFixed(1)}%` : '0%';
  $('statStudents').textContent = classes.reduce((sum, c) => sum + c.studentCount, 0);
  $('statEmpty').textContent = classes.filter((c) => c.studentCount === 0).length;
}

function renderYearOptions() {
  const current = $('yearFilter').value;
  const years = [...new Set(classes.map((c) => c.academicYear))].sort();
  $('yearFilter').innerHTML =
    '<option value="all">Tất cả niên khóa</option>' +
    years.map((y) => `<option value="${esc(y)}">${esc(y)}</option>`).join('');
  $('yearFilter').value = years.includes(current) ? current : 'all';
}

function renderClasses() {
  const kw = $('classSearch').value.trim().toLowerCase();
  const advKw = $('advisorSearch').value.trim().toLowerCase();
  const status = $('statusFilter').value;
  const year = $('yearFilter').value;

  const shown = classes.filter((c) => {
    const text = `${c.classCode} ${c.className} ${c.majorName}`.toLowerCase();
    const adv = advisorsMap.get(String(c.id));
    const advText = adv ? `${adv.name} ${adv.code}`.toLowerCase() : '';
    const okKw = !kw || text.includes(kw);
    const okAdv = !advKw || advText.includes(advKw);
    const okStatus = status === 'all' || (status === 'active' ? c.isActive : !c.isActive);
    const okYear = year === 'all' || c.academicYear === year;
    return okKw && okAdv && okStatus && okYear;
  });

  $('classBody').innerHTML = shown.length
    ? shown.map((c, i) => {
      const adv = advisorsMap.get(String(c.id));
      return `
      <tr data-id="${c.id}" class="${c.id === selectedId ? 'selected' : ''}">
        <td>${String(i + 1).padStart(2, '0')}</td>
        <td><span class="code">${esc(c.classCode)}</span></td>
        <td>${esc(c.className)}</td>
        <td>${esc(c.majorName)}</td>
        <td>${adv ? esc(adv.name) : '<span class="muted">Chưa có</span>'}</td>
        <td>${esc(c.academicYear)}</td>
        <td><strong>${c.studentCount}</strong></td>
        <td><span class="status-pill ${c.isActive ? 'status-studying' : 'status-no_status'}">${c.isActive ? 'Hoạt động' : 'Đã tắt'}</span></td>
        <td>
          <div class="cell-actions">
            <button type="button" class="sm" data-act="edit" data-id="${c.id}">Sửa</button>
            <button type="button" class="sm danger" data-act="delete" data-id="${c.id}">Xóa</button>
          </div>
        </td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="9" class="empty-report">Không có lớp nào phù hợp. Chọn "Thêm lớp" để tạo lớp mới.</td></tr>';

  $('tableFoot').textContent = `Hiển thị ${shown.length} trong tổng số ${classes.length} lớp`;
}

['classSearch', 'advisorSearch', 'statusFilter', 'yearFilter'].forEach((id) =>
  $(id).addEventListener(['classSearch', 'advisorSearch'].includes(id) ? 'input' : 'change', renderClasses),
);

$('classBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  const row = e.target.closest('tr[data-id]');
  if (btn) {
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') openDialog(classes.find((c) => c.id === id));
    if (btn.dataset.act === 'delete') await deleteClass(id);
  } else if (row) {
    await selectClass(row.dataset.id);
  }
});

async function deleteClass(id) {
  const c = classes.find((x) => x.id === id);
  if (!confirm(`Xóa lớp ${c.classCode}?`)) return;
  try {
    await api(`${API}/${id}`, 'DELETE');
    if (selectedId === id) {
      selectedId = null;
      $('studentPanel').hidden = true;
      $('detailEmpty').hidden = false;
    }
    await loadClasses();
  } catch (err) { alert(err.message); }
}

// ===== Thêm / sửa lớp =====
const dialog = $('classDialog');
const form = $('classForm');

function openDialog(cls) {
  editingId = cls ? cls.id : null;
  $('dialogTitle').textContent = cls ? 'Sửa lớp' : 'Thêm lớp';
  form.reset();
  $('formError').textContent = '';
  if (cls) {
    form.classCode.value = cls.classCode;
    form.clsName.value = cls.className;
    form.majorName.value = cls.majorName;
    form.academicYear.value = cls.academicYear;
    form.isActive.checked = cls.isActive;
  }
  dialog.showModal();
}

$('btnAdd').addEventListener('click', () => openDialog(null));
$('btnCancel').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    classCode: form.classCode.value.trim(),
    className: form.clsName.value.trim(),
    majorName: form.majorName.value.trim(),
    academicYear: form.academicYear.value.trim(),
    isActive: form.isActive.checked,
  };
  try {
    await api(editingId ? `${API}/${editingId}` : API, editingId ? 'PUT' : 'POST', payload);
    dialog.close();
    await loadClasses();
  } catch (err) { $('formError').textContent = err.message; }
});

// ===== Phân lớp =====
async function selectClass(id) {
  selectedId = id;
  const c = classes.find((x) => x.id === id);
  $('detailEmpty').hidden = true;
  $('studentPanel').hidden = false;
  $('panelTitle').textContent = `Phân lớp: ${c.classCode} - ${c.className}`;
  $('searchBox').value = '';
  await Promise.all([loadClasses(), loadStudents(), loadAvailable()]);
}

async function loadStudents() {
  const list = await api(`${API}/${selectedId}/students`);
  $('studentList').innerHTML = list.length
    ? list.map((s) => `<li><span class="code">${esc(s.studentCode)}</span> ${esc(s.fullName)}</li>`).join('')
    : '<li class="list-empty">Lớp chưa có sinh viên.</li>';
}

async function loadAvailable() {
  available = await api(`${API}/${selectedId}/available-students`);
  renderAvailable();
}

function renderAvailable() {
  const kw = $('searchBox').value.trim().toLowerCase();
  const checked = new Set([...document.querySelectorAll('#availableList input:checked')].map((i) => i.value));
  const shown = available.filter(
    (s) => s.studentCode.toLowerCase().includes(kw) || s.fullName.toLowerCase().includes(kw),
  );
  $('availableList').innerHTML = shown.length
    ? shown.map((s) => `
      <li><label>
        <input type="checkbox" value="${s.id}" ${checked.has(s.id) ? 'checked' : ''} />
        <span class="code">${esc(s.studentCode)}</span> ${esc(s.fullName)}
        <span class="sub-class">đang ở ${esc(s.currentClassCode)}</span>
      </label></li>`).join('')
    : '<li class="list-empty">Không có sinh viên nào để chuyển.</li>';
}

$('searchBox').addEventListener('input', renderAvailable);

$('btnAssign').addEventListener('click', async () => {
  const studentIds = [...document.querySelectorAll('#availableList input:checked')].map((i) => i.value);
  if (!studentIds.length) { alert('Hãy tick chọn ít nhất 1 sinh viên'); return; }
  try {
    const r = await api(`${API}/${selectedId}/students`, 'POST', { studentIds });
    alert(`Đã chuyển ${r.moved} sinh viên vào lớp`);
    await selectClass(selectedId);
  } catch (err) { alert(err.message); }
});

(async function init() {
  advisorsMap = await loadAdvisors();
  await loadClasses();
})();