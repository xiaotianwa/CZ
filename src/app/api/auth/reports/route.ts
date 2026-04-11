import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const reportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.string().min(1),
  reason: z.enum(['spam', 'abuse', 'inappropriate', 'other']),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { targetType, targetId, reason, description } = parsed.data;

    // 防止重复举报
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: payload.id,
        targetType,
        targetId,
        status: { in: ['pending', 'reviewed'] },
      },
    });

    if (existing) {
      return fail('你已经举报过了，请等待处理');
    }

    const report = await prisma.report.create({
      data: {
        reporterId: payload.id,
        targetType,
        targetId,
        reason,
        description: description || null,
      },
    });

    return ok(report, '举报已提交，我们会尽快处理');
  } catch (err) {
    return handleError(err);
  }
}
