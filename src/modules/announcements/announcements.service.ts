import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SaveAnnouncementDto } from './dto/save-announcement.dto';

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  constructor(private readonly ds: DataSource) {}

  /** synchronize đang tắt nên tự tạo bảng nếu chưa có (chạy an toàn nhiều lần). */
  async onModuleInit() {
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id          BIGINT(20)   NOT NULL AUTO_INCREMENT,
        title       VARCHAR(200) NOT NULL,
        content     TEXT         NOT NULL,
        category    VARCHAR(20)  NOT NULL DEFAULT 'general',
        class_id    BIGINT(20)   NULL,
        event_start DATE         NULL,
        event_end   DATE         NULL,
        is_pinned   TINYINT(1)   NOT NULL DEFAULT 0,
        publish_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by  VARCHAR(50)  NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_ann_publish (publish_at),
        KEY idx_ann_class (class_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await this.ds.query(`
      CREATE TABLE IF NOT EXISTS announcement_reads (
        announcement_id BIGINT(20) NOT NULL,
        student_id      BIGINT(20) NOT NULL,
        read_at         DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (announcement_id, student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  private readonly SELECT = `
    a.id, a.title, a.content, a.category,
    a.class_id AS classId,
    DATE_FORMAT(a.event_start, '%Y-%m-%d') AS eventStart,
    DATE_FORMAT(a.event_end,   '%Y-%m-%d') AS eventEnd,
    a.is_pinned AS isPinned,
    DATE_FORMAT(a.publish_at,  '%Y-%m-%d %H:%i:%s') AS publishAt,
    DATE_FORMAT(a.created_at,  '%Y-%m-%d %H:%i:%s') AS createdAt,
    a.created_by AS createdBy`;

  // ---------- Sinh viên ----------
  /** Tìm sinh viên của tài khoản đang đăng nhập (đi qua entity nên không phụ thuộc tên cột). */
  private async resolveStudent(user: any): Promise<{ id: string; classId: string | null }> {
    const code = user.refCode ?? user.username;
    const st: any = await this.ds.getRepository('Student').findOne({ where: { studentCode: code } as any });
    if (!st) throw new NotFoundException('Không tìm thấy hồ sơ sinh viên');
    return { id: String(st.id), classId: st.classId != null ? String(st.classId) : null };
  }

  async listForStudent(user: any) {
    const st = await this.resolveStudent(user);
    const rows = await this.ds.query(
      `SELECT ${this.SELECT}, (r.announcement_id IS NOT NULL) AS isRead
         FROM announcements a
         LEFT JOIN announcement_reads r ON r.announcement_id = a.id AND r.student_id = ?
        WHERE a.publish_at <= NOW() AND (a.class_id IS NULL OR a.class_id = ?)
        ORDER BY a.is_pinned DESC, a.publish_at DESC, a.id DESC
        LIMIT 50`,
      [st.id, st.classId],
    );
    const items = rows.map((r: any) => ({ ...r, isPinned: !!Number(r.isPinned), isRead: !!Number(r.isRead) }));
    return { items, unread: items.filter((x: any) => !x.isRead).length };
  }

  async markRead(user: any, id: number) {
    const st = await this.resolveStudent(user);
    await this.ds.query('INSERT IGNORE INTO announcement_reads (announcement_id, student_id) VALUES (?, ?)', [id, st.id]);
    return { ok: true };
  }

  async markAllRead(user: any) {
    const st = await this.resolveStudent(user);
    await this.ds.query(
      `INSERT IGNORE INTO announcement_reads (announcement_id, student_id)
       SELECT a.id, ? FROM announcements a
        WHERE a.publish_at <= NOW() AND (a.class_id IS NULL OR a.class_id = ?)`,
      [st.id, st.classId],
    );
    return { ok: true };
  }

  // ---------- Quản trị ----------
  async listAdmin() {
    const rows = await this.ds.query(
      `SELECT ${this.SELECT},
              CASE WHEN a.publish_at > NOW() THEN 'scheduled' ELSE 'sent' END AS status,
              (SELECT COUNT(*) FROM announcement_reads r WHERE r.announcement_id = a.id) AS readCount
         FROM announcements a
        ORDER BY a.publish_at DESC, a.id DESC`,
    );
    return rows.map((r: any) => ({ ...r, isPinned: !!Number(r.isPinned), readCount: Number(r.readCount) }));
  }

  private norm(dto: SaveAnnouncementDto) {
    if (dto.eventStart && dto.eventEnd && dto.eventEnd < dto.eventStart) {
      throw new BadRequestException('Ngày kết thúc nghỉ phải sau hoặc bằng ngày bắt đầu');
    }
    let publishAt: string | null = null;
    if (dto.publishAt) {
      publishAt = dto.publishAt.replace('T', ' ');
      if (publishAt.length === 16) publishAt += ':00';
    }
    return {
      title: dto.title.trim(),
      content: dto.content.trim(),
      category: dto.category,
      classId: dto.classId ? dto.classId : null,
      eventStart: dto.eventStart || null,
      eventEnd: dto.eventEnd || null,
      isPinned: dto.isPinned ? 1 : 0,
      publishAt,
    };
  }

  async create(user: any, dto: SaveAnnouncementDto) {
    const v = this.norm(dto);
    const res: any = await this.ds.query(
      `INSERT INTO announcements
         (title, content, category, class_id, event_start, event_end, is_pinned, publish_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?)`,
      [v.title, v.content, v.category, v.classId, v.eventStart, v.eventEnd, v.isPinned, v.publishAt, user.username ?? null],
    );
    return { id: res.insertId };
  }

  async update(id: number, dto: SaveAnnouncementDto) {
    const v = this.norm(dto);
    const res: any = await this.ds.query(
      `UPDATE announcements
          SET title = ?, content = ?, category = ?, class_id = ?, event_start = ?, event_end = ?, is_pinned = ?,
              publish_at = CASE WHEN ? THEN NOW() ELSE COALESCE(?, publish_at) END
        WHERE id = ?`,
      [v.title, v.content, v.category, v.classId, v.eventStart, v.eventEnd, v.isPinned, dto.sendNow ? 1 : 0, v.publishAt, id],
    );
    if (!res.affectedRows) throw new NotFoundException('Không tìm thấy thông báo');
    return { ok: true };
  }

  async remove(id: number) {
    await this.ds.query('DELETE FROM announcement_reads WHERE announcement_id = ?', [id]);
    const res: any = await this.ds.query('DELETE FROM announcements WHERE id = ?', [id]);
    if (!res.affectedRows) throw new NotFoundException('Không tìm thấy thông báo');
    return { ok: true };
  }
}