import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const wait = await checkRateLimit(payload.id, { namespace: 'verify-pwd', windowMs: 60_000, max: 5 });
    if (wait !== null) {
      return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);
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
