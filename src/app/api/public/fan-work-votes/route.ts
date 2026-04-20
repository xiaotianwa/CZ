import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SCORE_MAP: Record<string, number> = {
  awesome: 5,
  good: 4,
  normal: 3,
  bad: 2,
  terrible: 1,
};

// GET — 获取当前投票周期排名（公开）
export async function GET() {
  try {
    const now = new Date();
    const period = await prisma.fanWorkVotePeriod.findFirst({
      where: {
        isActive: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
    });

    if (!period) return ok({ period: null, ranking: [] });

    const votes = await prisma.fanWorkVote.findMany({
      where: { periodId: period.id },
      select: {
        fanWorkId: true,
        rating: true,
        fanWork: {
          select: {
            id: true,
            title: true,
            cover: true,
            authorName: true,
            type: true,
          },
        },
      },
    });

    const statsMap = new Map<string, {
      fanWorkId: string;
      title: string;
      cover: string;
      authorName: string;
      type: string;
      totalVotes: number;
      score: number;
      ratings: Record<string, number>;
    }>();

    for (const vote of votes) {
      let stat = statsMap.get(vote.fanWorkId);
      if (!stat) {
        stat = {
          fanWorkId: vote.fanWorkId,
          title: vote.fanWork.title,
          cover: vote.fanWork.cover,
          authorName: vote.fanWork.authorName,
          type: vote.fanWork.type,
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
      .map((s) => ({ ...s, avgScore: s.totalVotes > 0 ? +(s.score / s.totalVotes).toFixed(2) : 0 }))
      .sort((a, b) => b.score - a.score || b.totalVotes - a.totalVotes);

    return ok({
      period: {
        id: period.id,
        title: period.title,
        startAt: period.startAt,
        endAt: period.endAt,
      },
      ranking,
    });
  } catch (err) {
    return handleError(err);
  }
}
