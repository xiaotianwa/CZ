import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const now = Date.now();
    const record = attempts.get(payload.id);
    if (record && now < record.resetAt) {
      if (record.count >= MAX_ATTEMPTS) {
        return fail('操作过于频繁，请稍后再试', 429);
      }
      record.count++;
    } else {
      attempts.set(payload.id, { count: 1, resetAt: now + WINDOW_MS });
    }

    const body = await req.json();
    const { password } = body as { password?: string };
    if (!password || typeof password !== 'string') {
      return fail('请输入密码');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { password: true },
    });

    if (!user) {
      return fail('用户不存在', 404);
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return fail('密码不正确');
    }
    return ok({ valid: true });
  } catch (err) {
    return handleError(err);
  }
}
