import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { notifySystem } from '@/lib/notification';

const reviewSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  action: z.enum(['approve', 'reject']),
  rejectReason: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { id, action, rejectReason } = parsed.data;

    const fanWork = await prisma.fanWork.findUnique({
      where: { id },
      select: { id: true, title: true, userId: true, status: true },
    });
    if (!fanWork) return fail('作品不存在', 404);

    if (action === 'approve') {
      await prisma.fanWork.update({
        where: { id },
        data: { status: 'approved', isActive: true, rejectReason: null },
      });

      // 发送站内通知：审核通过
      if (fanWork.userId) {
        notifySystem(
          fanWork.userId,
          '二创作品审核通过',
          `你投稿的作品「${fanWork.title}」已通过审核，现已在二创作品集中展示！`,
          '/fan-works',
        ).catch(() => {});
      }

      return ok(null, '审核通过');
    } else {
      if (!rejectReason) return fail('请填写驳回原因');

      await prisma.fanWork.update({
        where: { id },
        data: { status: 'rejected', isActive: false, rejectReason },
      });

      // 发送站内通知：审核驳回
      if (fanWork.userId) {
        notifySystem(
          fanWork.userId,
          '二创作品审核未通过',
          `你投稿的作品「${fanWork.title}」未通过审核，原因：${rejectReason}`,
          '/fan-works',
        ).catch(() => {});
      }

      return ok(null, '已驳回');
    }
  } catch (err) {
    return handleError(err);
  }
}
