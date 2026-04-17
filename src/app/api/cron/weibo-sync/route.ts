import { NextRequest, NextResponse } from 'next/server';
import { syncWeibo } from '@/lib/weibo/sync';
import { invalidateCache } from '@/lib/cache';

/**
 * Cron 定时抓取微博原创动态
 *
 * 建议调用频率：2~5 分钟一次
 * 鉴权方式：Authorization: Bearer <CRON_SECRET>
 *
 * 使用示例（PM2 worker 或 crontab）：
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/weibo-sync
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncWeibo();
    if (result.inserted > 0) {
      invalidateCache('public:weibo');
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Cron] weibo-sync error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
