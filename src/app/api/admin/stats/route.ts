import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      users,
      feedback,
      media,
      announcements,
      admins,
      todayUsers,
      todayFeedback,
      pendingFeedback,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.feedback.count(),
      prisma.media.count(),
      prisma.announcement.count(),
      prisma.admin.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.feedback.count({ where: { createdAt: { gte: today } } }),
      prisma.feedback.count({ where: { status: 'pending' } }),
    ]);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        users,
        feedback,
        media,
        announcements,
        admins,
        todayUsers,
        todayFeedback,
        pendingFeedback,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json(
      { code: 500, message: '服务器内部错误', data: null },
      { status: 500 }
    );
  }
}
