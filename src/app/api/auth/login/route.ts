import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword, signUserToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: 400, message: '请求体必须是有效的 JSON', data: null },
      { status: 400 }
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, message: parsed.error.errors[0].message, data: null },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  // 获取客户端 IP
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // 登录频率限制（IP 级别）
  const retryAfter = await checkRateLimit(ip, { namespace: 'login', windowMs: 60_000, max: 10 });
  if (retryAfter !== null) {
    return NextResponse.json(
      { code: 429, message: `登录过于频繁，请 ${retryAfter} 秒后再试`, data: null },
      { status: 429 }
    );
  }

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { code: 401, message: '邮箱或密码错误', data: null },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { code: 401, message: '邮箱或密码错误', data: null },
        { status: 401 }
      );
    }

    // 生成 JWT
    const token = signUserToken({ id: user.id, email: user.email, role: user.role ?? 'user' });

    // 设置 cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `token=${token}`,
      'HttpOnly',
      'Path=/',
      isProduction ? 'Secure' : '',
      'SameSite=Lax',
      `Max-Age=${30 * 24 * 60 * 60}`,
    ].filter(Boolean);

    // 记录登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json(
      {
        code: 200,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            city: user.city,
            province: user.province,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': cookieOptions.join('; '),
        },
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 }
    );
  }
}
