import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { signTcgToken, setTcgCookie } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok, fail, handleError } from '@/lib/api';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

export async function POST(req: NextRequest) {
  try {
    const wait = await checkRateLimit(getClientIp(req), { namespace: 'tcg-admin-login', windowMs: 60_000, max: 5 });
    if (wait !== null) return fail(`操作过于频繁，请 ${wait} 秒后再试`, 429);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { email, password } = parsed.data;
    const op = await prisma.tcgOperator.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, avatar: true, role: true, password: true, isActive: true },
    });
    if (!op) return fail('账号或密码错误', 401);
    if (!op.isActive) return fail('账号已被禁用', 403);

    const valid = await verifyPassword(password, op.password);
    if (!valid) return fail('账号或密码错误', 401);

    await prisma.tcgOperator.update({ where: { id: op.id }, data: { lastLogin: new Date() } });
    await auditLog({ operatorId: op.id, action: 'operator.login', req });

    const token = signTcgToken({ id: op.id, email: op.email, role: op.role as 'tcg_super' | 'tcg_ops' | 'tcg_editor' });
    const response = ok({
      operator: { id: op.id, email: op.email, name: op.name, avatar: op.avatar, role: op.role },
    });
    setTcgCookie(response, token);
    return response;
  } catch (err) {
    return handleError(err);
  }
}
