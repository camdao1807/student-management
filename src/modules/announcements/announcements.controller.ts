import {
  Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe,
  Patch, Post, Req, UnauthorizedException,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { SaveAnnouncementDto } from './dto/save-announcement.dto';

/**
 * Lấy người dùng từ req.user (do guard JWT của dự án gắn vào, giống các controller khác).
 * Quản lý thông báo: admin + staff. Xem thông báo của mình: student.
 */
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  private user(req: any) {
    if (!req.user) throw new UnauthorizedException('Bạn chưa đăng nhập');
    return req.user;
  }
  private manager(req: any) {
    const u = this.user(req);
    if (!['admin', 'staff'].includes(u.role)) throw new ForbiddenException('Bạn không có quyền quản lý thông báo');
    return u;
  }
  private student(req: any) {
    const u = this.user(req);
    if (u.role !== 'student') throw new ForbiddenException('Chỉ sinh viên mới xem được mục này');
    return u;
  }

  // ----- Sinh viên -----
  @Get('me')
  mine(@Req() req: any) {
    return this.svc.listForStudent(this.student(req));
  }

  @Post('me/read-all')
  readAll(@Req() req: any) {
    return this.svc.markAllRead(this.student(req));
  }

  @Post('me/:id/read')
  read(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.svc.markRead(this.student(req), id);
  }

  // ----- Quản trị -----
  @Get('admin')
  admin(@Req() req: any) {
    this.manager(req);
    return this.svc.listAdmin();
  }

  @Post()
  create(@Req() req: any, @Body() dto: SaveAnnouncementDto) {
    return this.svc.create(this.manager(req), dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveAnnouncementDto) {
    this.manager(req);
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    this.manager(req);
    return this.svc.remove(id);
  }
}