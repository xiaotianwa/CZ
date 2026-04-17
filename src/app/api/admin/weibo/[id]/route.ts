import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/admin/weibo/[id] —— 更新可见性 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const schema = z.object({ isVisible: z.boolean() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const item = await prisma.weiboPost.update({
      where: { id },
      data: { isVisible: parsed.data.isVisible },
    });
    invalidateCache('public:weibo');
    return ok(item, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/admin/weibo/[id] —— 删除单条 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    await prisma.weiboPost.delete({ where: { id } });
    invalidateCache('public:weibo');
    return ok(null, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}
