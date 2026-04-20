import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const VALID_RATINGS = ['awesome', 'good', 'normal', 'bad', 'terrible'] as const;

const voteSchema = z.object({
  fanWorkId: z.string().min(1),
  rating: z.enum(VALID_RATINGS),
});

// POST — 投票（每人每天只能投一票，不限作品）
export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('请先登录', 401);

    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { fanWorkId, rating } = parsed.data;

    // 查找当前活跃的投票周期
    const now = new Date();
    const period = await prisma.fanWorkVotePeriod.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
    });
    if (!period) return fail('当前没有进行中的投票周期');

    // 检查作品是否存在且已审核通过
    const fanWork = await prisma.fanWork.findFirst({
      where: { id: fanWorkId, isActive: true, status: 'approved' },
    });
    if (!fanWork) return fail('作品不存在或未通过审核');

    // 不能给自己的作品投票
    if (fanWork.userId === payload.id) return fail('不能给自己的作品投票');

    // 检查今天是否已投票（任意作品）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayVote = await prisma.fanWorkVote.findFirst({
      where: {
        userId: payload.id,
        periodId: period.id,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });
    if (todayVote) return fail('今天已经投过票了，明天再来吧');

    const vote = await prisma.fanWorkVote.create({
      data: {
        periodId: period.id,
        fanWorkId,
        userId: payload.id,
        rating,
      },
    });

    return ok(vote, '投票成功');
  } catch (err) {
    return handleError(err);
  }
}

// GET — 获取当前用户在当前周期的投票状态
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);

    const now = new Date();
    const period = await prisma.fanWorkVotePeriod.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
    });

    if (!period) return ok({ period: null, votedToday: false, myVotes: [] });

    let votedToday = false;
    let myVotes: { fanWorkId: string; rating: string; createdAt: Date }[] = [];

    if (payload) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayVote = await prisma.fanWorkVote.findFirst({
        where: {
          userId: payload.id,
          periodId: period.id,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      });
      votedToday = !!todayVote;

      myVotes = await prisma.fanWorkVote.findMany({
        where: { userId: payload.id, periodId: period.id },
        select: { fanWorkId: true, rating: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return ok({
      period: {
        id: period.id,
        title: period.title,
        startAt: period.startAt,
        endAt: period.endAt,
      },
      votedToday,
      myVotes,
    });
  } catch (err) {
    return handleError(err);
  }
}
