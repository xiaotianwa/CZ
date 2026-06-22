import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // 从 cookie 获取 token
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { code: 401, message: '未登录', data: null },
        { status: 401 }
      );
    }

    // 验证 token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { code: 401, message: '登录已过期', data: null },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { code: 401, message: '用户不存在', data: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('Get me error:', err);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 }
    );
  }
}
