import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { revokeUserTokens } from '@/lib/token-blacklist';
import { deleteUserWithContent } from '@/lib/admin-users';
import { logAdminAction } from '@/lib/admin-audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, avatar: true,
        role: true, level: true, badge: true, customBadge: true, points: true,
        bio: true, isActive: true, createdAt: true,
      },
    });
    if (!user) return fail('用户不存在', 404);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!existing) return fail('用户不存在', 404);

    const summary = await deleteUserWithContent(id);

    // 审计：记录用户删除操作 + 级联删除统计（失败不阻塞返回）
    logAdminAction({
      operator: { id: admin.id, email: admin.email },
      action: 'user.delete',
      targetType: 'user',
      targetId: id,
      before: existing,
      after: summary,
      req,
    });

    return ok(summary, '删除成功');
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['fan', 'star', 'assistant', 'admin']).optional(),
  customBadge: z.union([z.string().trim().max(12, '标签最多 12 个字'), z.null()]).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return fail('用户不存在', 404);

    // 不允许禁用 star(董事长) 角色
    if (parsed.data.isActive === false && existing.role === 'star') {
      return fail('无法禁用董事长账号');
    }

    const updateData = {
      ...parsed.data,
      customBadge: typeof parsed.data.customBadge === 'string'
        ? (parsed.data.customBadge.trim() || null)
        : parsed.data.customBadge,
    };

    const user = await prisma.user.update({ where: { id }, data: updateData });

    if (parsed.data.isActive === false) {
      await revokeUserTokens(id);
    }

    // 审计：按不同字段变更选择具体 action，便于后续运营分析
    let action: string = 'user.update';
    if (parsed.data.role && parsed.data.role !== existing.role) action = 'user.role_change';
    else if (parsed.data.isActive === false) action = 'user.deactivate';
    else if (parsed.data.isActive === true) action = 'user.activate';
    else if (parsed.data.customBadge !== undefined) action = 'user.badge_update';

    logAdminAction({
      operator: { id: admin.id, email: admin.email },
      action,
      targetType: 'user',
      targetId: id,
      before: { isActive: existing.isActive, role: existing.role, customBadge: existing.customBadge },
      after: { isActive: user.isActive, role: user.role, customBadge: user.customBadge },
      req,
    });

    return ok({ id: user.id, isActive: user.isActive, role: user.role, customBadge: user.customBadge }, '更新成功');
  } catch (err) {
    return handleError(err);
  }
}
