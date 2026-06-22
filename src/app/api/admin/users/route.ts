import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, paginated, handleError, getSearchParams } from '@/lib/api';
import { createManagedUser, managedUserRoles } from '@/lib/admin-users';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { page, pageSize, keyword } = getSearchParams(req.url);
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'disabled') where.isActive = false;

    const [list, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          level: true,
          badge: true,
          customBadge: true,
          points: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(list, total, page, pageSize);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  email: z.string().trim().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().trim().min(1, '昵称不能为空').max(20, '昵称最多20个字符'),
  role: z.enum(managedUserRoles).default('fan'),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const user = await createManagedUser(parsed.data);
    return ok(user, '创建成功');
  } catch (err) {
    return handleError(err);
  }
}
