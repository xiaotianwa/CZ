import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { checkBannedWords } from '@/lib/banned-words';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const feedbackSchema = z.object({
  type: z.enum(['suggestion', 'bug', 'other']).default('suggestion'),
  content: z.string().min(5, '内容至少5个字').max(1000, '内容最多1000字'),
  contact: z.string().max(100, '联系方式最多100字').optional().default(''),
});

export async function POST(req: NextRequest) {
  try {
    const wait = checkRateLimit(getClientIp(req), { namespace: 'feedback', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
    }

    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { type, content, contact } = parsed.data;

    // 违禁词检测
    const banned = checkBannedWords(content);
    if (banned) {
      return fail(`内容包含违禁词「${banned}」，请修改后重新提交`);
    }

    // 尝试获取当前用户（可选，不强制登录）
    const currentUser = await getCurrentUser(req);
    const userId: string | undefined = currentUser?.id;

    const feedback = await prisma.feedback.create({
      data: {
        type,
        content,
        contact: contact || null,
        userId: userId || null,
      },
    });

    return ok({ id: feedback.id }, '反馈提交成功，感谢你的建议！');
  } catch (err) {
    return handleError(err);
  }
}
