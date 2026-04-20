import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { ok, paginated, fail, handleError, getSearchParams } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const me = await requireAdmin(req);
    if (me.role !== 'super_admin') {
      return fail('仅超级管理员可管理管理员列表', 403);
    }

    const { page, pageSize, keyword } = getSearchParams(req.url);

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.admin.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().min(1, '名称不能为空'),
  role: z.enum(['super_admin', 'admin', 'editor']).default('admin'),
});

export async function POST(req: NextRequest) {
  try {
    const me = await requireAdmin(req);
    if (me.role !== 'super_admin') {
      return fail('仅超级管理员可创建管理员', 403);
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { email, password, name, role } = parsed.data;

    const exists = await prisma.admin.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return fail('该邮箱已注册');
    }

    const hashed = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: { email, password: hashed, name, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return ok(admin, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
