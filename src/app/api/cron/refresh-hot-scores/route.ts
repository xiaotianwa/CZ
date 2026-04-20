import { NextRequest, NextResponse } from 'next/server';
import { refreshAllHotScores } from '@/lib/hot-score';

/**
 * Cron 定时刷新所有帖子热度分
 * 建议每 10-30 分钟执行一次
 * 鉴权方式：Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updated = await refreshAllHotScores();
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error('[Cron] refreshHotScores error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
