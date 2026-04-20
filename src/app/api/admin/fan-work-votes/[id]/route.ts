import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

type RouteParams = { params: Promise<{ id: string }> };

// GET — 获取某周期的投票统计排名
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(req);
    const { id } = await params;

    const period = await prisma.fanWorkVotePeriod.findUnique({ where: { id } });
    if (!period) return fail('投票周期不存在', 404);

    // 获取该周期所有投票
    const votes = await prisma.fanWorkVote.findMany({
      where: { periodId: id },
      select: {
        fanWorkId: true,
        rating: true,
        userId: true,
        createdAt: true,
        user: { select: { name: true } },
        fanWork: { select: { title: true, cover: true, authorName: true } },
      },
    });

    // 按作品聚合统计
    const statsMap = new Map<string, {
      fanWorkId: string;
      title: string;
      cover: string;
      authorName: string;
      totalVotes: number;
      score: number;
      ratings: Record<string, number>;
    }>();

    const SCORE_MAP: Record<string, number> = {
      awesome: 5,
      good: 4,
      normal: 3,
      bad: 2,
      terrible: 1,
    };

    for (const vote of votes) {
      let stat = statsMap.get(vote.fanWorkId);
      if (!stat) {
        stat = {
          fanWorkId: vote.fanWorkId,
          title: vote.fanWork.title,
          cover: vote.fanWork.cover,
          authorName: vote.fanWork.authorName,
          totalVotes: 0,
          score: 0,
          ratings: { awesome: 0, good: 0, normal: 0, bad: 0, terrible: 0 },
        };
        statsMap.set(vote.fanWorkId, stat);
      }
      stat.totalVotes++;
      stat.score += SCORE_MAP[vote.rating] || 3;
      stat.ratings[vote.rating] = (stat.ratings[vote.rating] || 0) + 1;
    }

    const ranking = Array.from(statsMap.values())
      .map((s) => ({ ...s, avgScore: s.totalVotes > 0 ? s.score / s.totalVotes : 0 }))
      .sort((a, b) => b.score - a.score || b.totalVotes - a.totalVotes);

    return ok({
      period,
      ranking,
      totalVotes: votes.length,
    });
  } catch (err) {
    return handleError(err);
  }
}
