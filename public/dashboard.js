const API = '/dashboard';
const STATUS = {
  studying: { label: 'Đang học', color: '#15966c' },
  reserved: { label: 'Bảo lưu', color: '#d28a28' },
  dropped: { label: 'Thôi học', color: '#cf5a61' },
  graduated: { label: 'Đã tốt nghiệp', color: '#4776d0' },
  no_status: { label: 'Chưa có trạng thái', color: '#aaa6b7' },
};
const GENDER = { male: 'Nam', female: 'Nữ', other: 'Khác' };
const $ = (id) => document.getElementById(id);
const number = (value) => Number(value || 0).toLocaleString('vi-VN');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const dateLabel = (value) => {
  if (!value) return '—';
  const date = String(value).slice(0, 10);
  return date.includes('-') ? date.split('-').reverse().join('/') : date;
};

const state = { page: 1, limit: 20, total: 0, totalPages: 1, sortBy: 'studentCode', sortOrder: 'ASC' };
let searchTimer;
let exportInProgress = false;

async function api(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  let data;
  try { data = await response.json(); } catch (_) { data = null; }
  if (!response.ok) {
    const message = data?.message;
    throw new Error(Array.isArray(message) ? message.join('\n') : message || `Lỗi ${response.status}`);
  }
  return data;
}

function showToast(message, success = true) {
  const toast = $('toast');
  toast.textContent = message;
  toast.style.background = success ? 'var(--ok)' : 'var(--err)';
  toast.style.display = 'block';
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

async function loadOverview() {
  $('overviewState').hidden = false;
  $('overviewState').textContent = 'Đang tải dữ liệu tổng quan...';
  $('overviewError').hidden = true;
  try {
    const data = await api(`${API}/overview`);
    $('studentsTotal').textContent = number(data.stats.students.total);
    $('studentsActive').textContent = number(data.stats.students.active);
    $('studentsArchived').textContent = number(data.stats.students.archived);
    $('classesTotal').textContent = number(data.stats.classes.total);
    $('classesActive').textContent = number(data.stats.classes.active);
    $('employeesTotal').textContent = number(data.stats.employees.total);
    $('employeesActive').textContent = number(data.stats.employees.active);
    $('studentsStudying').textContent = number(data.stats.studentsStudying);
    renderStatusChart(data.statusDistribution, data.stats.students.active);
    renderBarChart('classChart', data.byClass, (item) => `${item.classCode} · ${item.className}`, 'total');
    renderBarChart('cohortChart', data.byAcademicYear, (item) => item.academicYear, 'total');
    $('overviewState').hidden = true;
  } catch (error) {
    $('overviewState').hidden = true;
    $('overviewError').textContent = `Không tải được dữ liệu tổng quan: ${error.message}`;
    $('overviewError').hidden = false;
  }
}

function renderStatusChart(distribution, total) {
  const svg = $('statusDonut');
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = (distribution || []).filter((item) => item.count > 0).map((item) => {
    const config = STATUS[item.status] || STATUS.no_status;
    const length = total ? (item.count / total) * circumference : 0;
    const segment = `<circle class="donut-segment" cx="120" cy="120" r="${radius}" stroke="${config.color}" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${escapeHtml(item.label)}: ${number(item.count)} (${item.percentage}%)</title></circle>`;
    offset += length;
    return segment;
  });
  svg.innerHTML = `<circle class="donut-track" cx="120" cy="120" r="${radius}"></circle>${segments.join('')}`;
  $('statusTotal').textContent = number(total);
  $('statusLegend').innerHTML = (distribution || []).map((item) => {
    const config = STATUS[item.status] || STATUS.no_status;
    return `<div class="legend-item" title="${escapeHtml(item.label)}: ${number(item.count)} sinh viên">
      <span class="legend-dot" style="background:${config.color}"></span>
      <span>${escapeHtml(item.label)}</span><strong>${number(item.count)}</strong>
      <small>${item.percentage}%</small>
    </div>`;
  }).join('');
}

async function loadOptions() {
  try {
    const data = await api(`${API}/report/options`);
    $('filterClass').innerHTML = '<option value="">Tất cả lớp</option>' + data.classes.map((item) =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.classCode)} - ${escapeHtml(item.className)}</option>`).join('');
    $('filterYear').innerHTML = '<option value="">Tất cả khóa</option>' + data.academicYears.map((year) =>
      `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('');
  } catch (error) {
    showToast(`Không tải được bộ lọc: ${error.message}`, false);
  }
}

function buildParams(includePagination = true) {
  const params = new URLSearchParams();
  const query = $('filterQuery').value.trim();
  if (query) params.set('q', query);
  if ($('filterClass').value) params.set('classId', $('filterClass').value);
  if ($('filterYear').value) params.set('academicYear', $('filterYear').value);
  if ($('filterStatus').value) params.set('status', $('filterStatus').value);
  params.set('archiveScope', $('filterArchive').value);
  if ($('filterStartDate').value) params.set('startDate', $('filterStartDate').value);
  if ($('filterEndDate').value) params.set('endDate', $('filterEndDate').value);
  params.set('sortBy', state.sortBy);
  params.set('sortOrder', state.sortOrder);
  if (includePagination) {
    params.set('page', state.page);
    params.set('limit', state.limit);
  }
  return params;
}

async function loadReport() {
  $('reportState').hidden = false;
  $('reportState').textContent = 'Đang tải báo cáo...';
  $('reportError').hidden = true;
  $('reportEmpty').hidden = true;
  try {
    const data = await api(`${API}/report/students?${buildParams()}`);
    state.total = data.meta.total;
    state.totalPages = Math.max(1, data.meta.totalPages);
    renderRows(data.data);
    renderSortButtons();
    $('recordCount').textContent = `${number(state.total)} bản ghi sau lọc`;
    $('reportSummary').textContent = `${number(state.total)} sinh viên phù hợp với bộ lọc`;
    $('pageNumber').textContent = `Trang ${state.page} / ${state.totalPages}`;
    $('prevPage').disabled = state.page <= 1;
    $('nextPage').disabled = state.page >= state.totalPages;
    $('reportEmpty').hidden = state.total !== 0;
    $('reportState').hidden = true;
  } catch (error) {
    $('reportRows').innerHTML = '';
    $('reportState').hidden = true;
    $('reportError').textContent = `Không tải được báo cáo: ${error.message}`;
    $('reportError').hidden = false;
    $('recordCount').textContent = 'Không có dữ liệu';
    $('reportSummary').textContent = 'Có lỗi khi tải báo cáo';
  }
}

function renderRows(rows) {
  const start = (state.page - 1) * state.limit;
  $('reportRows').innerHTML = rows.map((row, index) => {
    const status = row.status || 'no_status';
    const statusInfo = STATUS[status] || STATUS.no_status;
    return `<tr>
      <td>${number(start + index + 1)}</td>
      <td><strong>${escapeHtml(row.studentCode)}</strong></td>
      <td>${escapeHtml(row.fullName)}</td>
      <td class="class-cell"><strong>${escapeHtml(row.classCode || '—')}</strong><small>${escapeHtml(row.className || '')}</small></td>
      <td>${escapeHtml(row.academicYear || '—')}</td>
      <td>${escapeHtml(GENDER[row.gender] || '—')}</td>
      <td>${escapeHtml(row.email)}</td>
      <td><span class="status-pill status-${escapeHtml(status)}">${escapeHtml(statusInfo.label)}</span>${row.archived ? '<span class="archived-label">Lưu trữ</span>' : ''}</td>
      <td>${dateLabel(row.admissionDate)}</td>
    </tr>`;
  }).join('');
}

function renderBarChart(elementId, rows, labelFor, valueKey) {
  const container = $(elementId);
  if (!rows?.length) {
    container.innerHTML = '<div class="chart-empty">Chưa có dữ liệu phù hợp</div>';
    return;
  }
  const maximum = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));
  container.innerHTML = rows.map((row) => {
    const value = Number(row[valueKey] || 0);
    const label = labelFor(row);
    const width = value ? Math.max(2, (value / maximum) * 100) : 0;
    return `<div class="bar-row" title="${escapeHtml(label)}: ${number(value)} sinh viên">
      <span class="bar-label">${escapeHtml(label)}</span>
      <span class="bar-track"><i class="bar-fill" style="width:${width}%"></i></span>
      <strong class="bar-value">${number(value)}</strong>
    </div>`;
  }).join('');
}

function renderSortButtons() {
  document.querySelectorAll('[data-sort]').forEach((button) => {
    const indicator = button.querySelector('span');
    indicator.textContent = button.dataset.sort === state.sortBy ? (state.sortOrder === 'ASC' ? '↑' : '↓') : '';
    button.setAttribute('aria-sort', button.dataset.sort === state.sortBy ? (state.sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none');
  });
}

function filtersChanged() {
  state.page = 1;
  loadReport();
}

async function exportReport(format) {
  if (exportInProgress) return;
  exportInProgress = true;
  $('exportCsv').disabled = true;
  $('exportXlsx').disabled = true;
  try {
    const params = buildParams(false);
    params.set('format', format);
    const response = await fetch(`${API}/report/students/export?${params}`);
    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch (_) { error = null; }
      throw new Error(error?.message || `Lỗi ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = format === 'csv' ? 'student-report.csv' : 'student-report.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo ${format.toUpperCase()}`);
  } catch (error) {
    showToast(`Xuất báo cáo thất bại: ${error.message}`, false);
  } finally {
    exportInProgress = false;
    $('exportCsv').disabled = false;
    $('exportXlsx').disabled = false;
  }
}

$('refreshDashboard').addEventListener('click', () => {
  loadOverview();
  loadReport();
});
$('filterQuery').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(filtersChanged, 300);
});
['filterClass', 'filterYear', 'filterStatus', 'filterArchive', 'filterStartDate', 'filterEndDate'].forEach((id) => {
  $(id).addEventListener('change', filtersChanged);
});
$('clearFilters').addEventListener('click', () => {
  $('filterQuery').value = '';
  $('filterClass').value = '';
  $('filterYear').value = '';
  $('filterStatus').value = '';
  $('filterArchive').value = 'active';
  $('filterStartDate').value = '';
  $('filterEndDate').value = '';
  state.sortBy = 'studentCode';
  state.sortOrder = 'ASC';
  filtersChanged();
});
document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.sortBy === button.dataset.sort) state.sortOrder = state.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    else { state.sortBy = button.dataset.sort; state.sortOrder = 'ASC'; }
    state.page = 1;
    loadReport();
  });
});
$('pageLimit').addEventListener('change', () => {
  state.limit = Number($('pageLimit').value);
  state.page = 1;
  loadReport();
});
$('prevPage').addEventListener('click', () => {
  if (state.page > 1) { state.page -= 1; loadReport(); }
});
$('nextPage').addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page += 1; loadReport(); }
});
$('exportCsv').addEventListener('click', () => exportReport('csv'));
$('exportXlsx').addEventListener('click', () => exportReport('xlsx'));

loadOverview();
loadOptions();
loadReport();