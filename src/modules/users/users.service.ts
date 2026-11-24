import {
  ConflictException, Injectable, Logger, NotFoundException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User, UserRole } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ProvisionUsersDto } from './dto/provision-users.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  /** Tự tạo admin đầu tiên nếu hệ thống chưa có admin nào */
  async onModuleInit() {
    const count = await this.repo.count({ where: { role: UserRole.ADMIN } });
    if (count > 0) return;
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    if (await this.repo.findOne({ where: { username } })) return;
    await this.repo.save(
      this.repo.create({
        username,
        passwordHash: await bcrypt.hash(password, 10),
        fullName: 'Quản trị hệ thống',
        role: UserRole.ADMIN,
      }),
    );
    this.logger.warn(`Đã tạo admin mặc định "${username}". Hãy đổi mật khẩu ngay sau khi đăng nhập!`);
  }

  // passwordHash & token đều là select:false nên không bao giờ lọt ra response
  async findAll(search?: string, role?: UserRole) {
    const qb = this.repo.createQueryBuilder('u').orderBy('u.id', 'ASC');
    if (search) {
      qb.andWhere(
        '(u.username LIKE :s OR u.fullName LIKE :s OR u.email LIKE :s OR u.refCode LIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (role) qb.andWhere('u.role = :role', { role });
    return qb.getMany();
  }

  /** Dùng cho đăng nhập — lấy kèm passwordHash */
  findByUsernameWithPassword(username: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :username', { username })
      .getOne();
  }

  findByUsernameOrEmail(value: string) {
    return this.repo.findOne({ where: [{ username: value }, { email: value }] });
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Không tìm thấy tài khoản #${id}`);
    return user;
  }

  async create(dto: CreateUserDto) {
    if (await this.repo.findOne({ where: { username: dto.username } })) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }
    const { password, ...rest } = dto;
    const user = this.repo.create({ ...rest, passwordHash: await bcrypt.hash(password, 10) });
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  /** Cấp tài khoản hàng loạt (username = mã SV/NV/CVHT) */
  async provision(dto: ProvisionUsersDto) {
    const passwordHash = await bcrypt.hash(dto.defaultPassword, 10);
    const created: string[] = [];
    const skipped: string[] = [];

    for (const it of dto.items) {
      if (await this.repo.findOne({ where: { username: it.code } })) {
        skipped.push(it.code);
        continue;
      }
      await this.repo.save(
        this.repo.create({
          username: it.code,
          passwordHash,
          fullName: it.fullName ?? null,
          email: it.email ?? null,
          role: dto.role as UserRole,
          refCode: it.code,
        }),
      );
      created.push(it.code);
    }
    return { created: created.length, skipped, message: `Đã cấp ${created.length} tài khoản` };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    await this.repo.save(user);
    return this.findOne(id);
  }

  async toggleStatus(id: string) {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    await this.repo.save(user);
    return user;
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    await this.repo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changeOwnPassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
      throw new ConflictException('Mật khẩu cũ không đúng');
    }
    await this.repo.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async remove(id: string) {
    await this.repo.remove(await this.findOne(id));
    return { message: 'Đã xóa tài khoản' };
  }

  // ---------- Quên mật khẩu ----------
  async saveResetToken(user: User, rawToken: string, minutes = 15) {
    await this.repo.update(user.id, {
      resetTokenHash: createHash('sha256').update(rawToken).digest('hex'),
      resetTokenExpires: new Date(Date.now() + minutes * 60_000),
    });
  }

  async resetByToken(rawToken: string, newPassword: string) {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const user = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.resetTokenExpires')
      .where('u.resetTokenHash = :hash', { hash })
      .getOne();
    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new ConflictException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }
    await this.repo.update(user.id, {
      passwordHash: await bcrypt.hash(newPassword, 10),
      resetTokenHash: null,
      resetTokenExpires: null,
    });
    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
