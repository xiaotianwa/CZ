import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * 路径白名单正则 —— 必须 `/` 开头，仅允许 URL path 常见字符，最长 200。
 * 防御点：
 *  1. 限长避免攻击者构造超长字符串刷爆 PageView 表（单条记录膨胀 + IO 放大）
 *  2. 白名单字符避免恶意 payload 被写入 DB 后在 /admin/site-logs 被误渲染或触发日志注入
 */
const pathSchema = z.object({
  path: z.string()
    .min(1)
    .max(200)
    .regex(/^\/[\w\-./?=&%#:@+,]*$/, 'invalid path'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // 接口级 IP 全局限流：每分钟 60 次（SPA 正常浏览远低于此阈值）
    // 注意：middleware 的通用写限流按 (ip, path) 分桶，攻击者可换 path 绕过；
    // 此处按 IP 全局限流补齐该缺口，超限静默丢弃不影响正常前端。
    const wait = await checkRateLimit(ip, { namespace: 'pageview', windowMs: 60_000, max: 60 });
    if (wait !== null) {
      return ok(null);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = pathSchema.safeParse(body);
    if (!parsed.success) {
      // 静默丢弃非法请求，不透露校验规则给攻击者
      return ok(null);
    }

    const { path } = parsed.data;
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const ua = req.headers.get('user-agent') || undefined;
    const referrer = req.headers.get('referer') || undefined;

    await prisma.pageView.create({
      data: { path, ip, ua, referrer, date },
    });

    return ok(null);
  } catch (err) {
    return handleError(err);
  }
}
