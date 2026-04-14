import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const updateProfileSchema = z.object({
  name: z.string().min(1, '昵称不能为空').max(20, '昵称最多20个字符').optional(),
  bio: z.string().max(200, '个性签名最多200个字符').optional(),
  avatar: z.string().url('头像地址格式不正确').optional().nullable(),
  city: z.string().max(50, '位置名最多50个字符').optional().nullable(),
});

export async function PUT(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
    if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar;
    if (parsed.data.city !== undefined) data.city = parsed.data.city;

    if (Object.keys(data).length === 0) {
      return fail('没有需要更新的字段');
    }

    const user = await prisma.user.update({
      where: { id: payload.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        level: true,
        badge: true,
        points: true,
        bio: true,
        city: true,
        createdAt: true,
      },
    });

    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}
