import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import ExcelJS from 'exceljs';
import { DashboardExportQueryDto } from './dto/dashboard-export-query.dto';
import { DashboardReportQueryDto } from './dto/dashboard-report-query.dto';

const STATUS_LABELS = {
  studying: 'Đang học',
  reserved: 'Bảo lưu',
  dropped: 'Thôi học',
  graduated: 'Đã tốt nghiệp',
  no_status: 'Chưa có trạng thái',
} as const;

const STATUS_KEYS = Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>;

const SORT_COLUMNS: Record<DashboardReportQueryDto['sortBy'], string> = {
  studentCode: 's.student_code',
  fullName: 's.full_name',
  classCode: 'c.class_code',
  academicYear: 'c.academic_year',
  gender: 's.gender',
  email: 's.email',
  status: 'current_status.status',
  admissionDate: 'admission.admission_date',
};

const STUDENT_JOINS = `
  FROM students s
  LEFT JOIN student_classes c ON c.id = s.class_id
  LEFT JOIN v_student_current_status current_status
    ON current_status.student_id = s.id
  LEFT JOIN (
    SELECT student_id, MIN(effective_date) AS admission_date
    FROM student_status
    WHERE status = 'studying'
    GROUP BY student_id
  ) admission ON admission.student_id = s.id`;

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview() {
    const statsRows = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM students) AS students_total,
        (SELECT COUNT(*) FROM students WHERE deleted_at IS NULL) AS students_active,
        (SELECT COUNT(*) FROM students WHERE deleted_at IS NOT NULL) AS students_archived,
        (SELECT COUNT(*) FROM student_classes) AS classes_total,
        (SELECT COUNT(*) FROM student_classes WHERE is_active = 1) AS classes_active,
        (SELECT COUNT(*) FROM employees) AS employees_total,
        (SELECT COUNT(*) FROM employees WHERE is_active = 1) AS employees_active,
        (
          SELECT COUNT(*)
          FROM students s
          INNER JOIN v_student_current_status current_status
            ON current_status.student_id = s.id
          WHERE s.deleted_at IS NULL AND current_status.status = 'studying'
        ) AS students_studying`);
      const stats = statsRows[0];

      const statusRows = await this.dataSource.query(`
      SELECT current_status.status, COUNT(DISTINCT s.id) AS total
      FROM students s
      LEFT JOIN v_student_current_status current_status
        ON current_status.student_id = s.id
      WHERE s.deleted_at IS NULL
      GROUP BY current_status.status`);

    const [byClass, byAcademicYear] = await Promise.all([
      this.dataSource.query(`
        SELECT c.id, c.class_code AS classCode, c.class_name AS className,
               c.academic_year AS academicYear, COUNT(s.id) AS total
        FROM student_classes c
        LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
        GROUP BY c.id, c.class_code, c.class_name, c.academic_year
        ORDER BY c.academic_year, c.class_code`),
      this.dataSource.query(`
        SELECT c.academic_year AS academicYear, COUNT(s.id) AS total
        FROM student_classes c
        LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
        GROUP BY c.academic_year
        ORDER BY c.academic_year`),
    ]);

    const activeStudents = Number(stats.students_active);
    const statusCounts = new Map<string, number>(
      statusRows
        .filter((row: { status: string | null }) => row.status !== null)
        .map(
          (row: { status: string; total: string | number }): [string, number] =>
            [row.status, Number(row.total)],
        ),
    );
    const knownStatusTotal = STATUS_KEYS.filter((status) => status !== 'no_status')
      .reduce((total, status) => total + (statusCounts.get(status) ?? 0), 0);
    statusCounts.set('no_status', Math.max(0, activeStudents - knownStatusTotal));

    return {
      stats: {
        students: {
          total: Number(stats.students_total),
          active: activeStudents,
          archived: Number(stats.students_archived),
        },
        classes: {
          total: Number(stats.classes_total),
          active: Number(stats.classes_active),
        },
        employees: {
          total: Number(stats.employees_total),
          active: Number(stats.employees_active),
        },
        studentsStudying: Number(stats.students_studying),
      },
      statusDistribution: this.formatStatusDistribution(
        statusCounts,
        activeStudents,
      ),
      byClass,
      byAcademicYear,
    };
  }

  async getReportOptions() {
    const [classes, years] = await Promise.all([
      this.dataSource.query(`
        SELECT id, class_code AS classCode, class_name AS className,
               academic_year AS academicYear, is_active AS isActive
        FROM student_classes
        ORDER BY academic_year, class_code`),
      this.dataSource.query(`
        SELECT DISTINCT academic_year AS academicYear
        FROM student_classes
        ORDER BY academic_year`),
    ]);

    return { classes, academicYears: years.map((row: { academicYear: string }) => row.academicYear) };
  }

  async getStudentReport(query: DashboardReportQueryDto) {
    this.validateDateRange(query);
    const { where, params } = this.buildFilters(query);
    const orderBy = SORT_COLUMNS[query.sortBy] ?? SORT_COLUMNS.studentCode;
    const direction = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    const offset = (query.page - 1) * query.limit;

    const [countRows, data] = await Promise.all([
        this.dataSource.query(
          `SELECT COUNT(*) AS total ${STUDENT_JOINS} ${where}`,
          params,
        ),
        this.dataSource.query(
          `SELECT
             s.id, s.student_code AS studentCode, s.full_name AS fullName,
             c.class_code AS classCode, c.class_name AS className,
             c.academic_year AS academicYear, s.gender, s.email,
             current_status.status AS status,
             admission.admission_date AS admissionDate,
             s.deleted_at IS NOT NULL AS archived
           ${STUDENT_JOINS}
           ${where}
           ORDER BY ${orderBy} ${direction}, s.id ASC
           LIMIT ? OFFSET ?`,
          [...params, query.limit, offset],
        ),
      ]);

    const total = Number(countRows[0]?.total ?? 0);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async exportStudentReport(query: DashboardExportQueryDto) {
    this.validateDateRange(query);
    const { where, params } = this.buildFilters(query);
    const orderBy = SORT_COLUMNS[query.sortBy] ?? SORT_COLUMNS.studentCode;
    const direction = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    const rows = await this.dataSource.query(
      `SELECT
         s.student_code AS studentCode, s.full_name AS fullName,
         c.class_code AS classCode, c.class_name AS className,
         c.academic_year AS academicYear, s.gender, s.email,
         current_status.status AS status,
         admission.admission_date AS admissionDate
       ${STUDENT_JOINS}
       ${where}
       ORDER BY ${orderBy} ${direction}, s.id ASC`,
      params,
    );

    if (query.format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: 'student-report.csv',
        data: this.toCsv(rows),
      };
    }

    return {
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'student-report.xlsx',
      data: await this.toXlsx(rows),
    };
  }

  private buildFilters(
    query: DashboardReportQueryDto,
    includeClassFilters = true,
  ) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.archiveScope === 'active') conditions.push('s.deleted_at IS NULL');
    if (query.archiveScope === 'archived') conditions.push('s.deleted_at IS NOT NULL');
    if (query.q) {
      conditions.push('(s.student_code LIKE ? OR s.full_name LIKE ?)');
      params.push(`%${query.q}%`, `%${query.q}%`);
    }
    if (includeClassFilters && query.classId) {
      conditions.push('s.class_id = ?');
      params.push(query.classId);
    }
    if (includeClassFilters && query.academicYear) {
      conditions.push('c.academic_year = ?');
      params.push(query.academicYear);
    }
    if (query.status === 'no_status') {
      conditions.push('current_status.status IS NULL');
    } else if (query.status) {
      conditions.push('current_status.status = ?');
      params.push(query.status);
    }
    if (query.startDate) {
      conditions.push('admission.admission_date >= ?');
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push('admission.admission_date <= ?');
      params.push(query.endDate);
    }

    return {
      where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  private formatStatusDistribution(
    counts: Map<string, number>,
    denominator: number,
  ) {
    return STATUS_KEYS.map((status) => {
      const count = counts.get(status) ?? 0;
      return {
        status,
        label: STATUS_LABELS[status],
        count,
        percentage: denominator
          ? Math.round((count / denominator) * 1000) / 10
          : 0,
      };
    });
  }

  private validateDateRange(query: DashboardReportQueryDto) {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }
  }

  private toCsv(rows: Record<string, unknown>[]) {
    const headers = [
      'STT',
      'Mã sinh viên',
      'Họ và tên',
      'Mã lớp',
      'Lớp',
      'Khóa học',
      'Giới tính',
      'Email',
      'Trạng thái',
      'Ngày nhập học',
    ];
    const values = rows.map((row, index) => [
      index + 1,
      row.studentCode,
      row.fullName,
      row.classCode,
      row.className,
      row.academicYear,
      this.genderLabel(row.gender),
      row.email,
      STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? 'Chưa có trạng thái',
      row.admissionDate,
    ]);
    const csv = [headers, ...values]
      .map((line) => line.map((value) => this.csvCell(value)).join(','))
      .join('\r\n');
    return Buffer.from(`\uFEFF${csv}`, 'utf8');
  }

  private async toXlsx(rows: Record<string, unknown>[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo sinh viên');
    worksheet.columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Mã sinh viên', key: 'studentCode', width: 18 },
      { header: 'Họ và tên', key: 'fullName', width: 28 },
      { header: 'Mã lớp', key: 'classCode', width: 16 },
      { header: 'Lớp', key: 'className', width: 30 },
      { header: 'Khóa học', key: 'academicYear', width: 16 },
      { header: 'Giới tính', key: 'gender', width: 14 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Trạng thái', key: 'status', width: 20 },
      { header: 'Ngày nhập học', key: 'admissionDate', width: 18 },
    ];
    worksheet.getRow(1).font = { bold: true };
    rows.forEach((row, index) => {
      worksheet.addRow({
        index: index + 1,
        studentCode: row.studentCode,
        fullName: row.fullName,
        classCode: row.classCode,
        className: row.className,
        academicYear: row.academicYear,
        gender: this.genderLabel(row.gender),
        email: row.email,
        status:
          STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ??
          'Chưa có trạng thái',
        admissionDate: row.admissionDate,
      });
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private csvCell(value: unknown) {
    const text = String(value ?? '');
    const safeText = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }

  private genderLabel(value: unknown) {
    if (value === 'male') return 'Nam';
    if (value === 'female') return 'Nữ';
    if (value === 'other') return 'Khác';
    return '';
  }
}