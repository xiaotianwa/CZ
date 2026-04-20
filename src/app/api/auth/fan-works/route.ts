import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { moderateText, saveModerationLog } from '@/lib/content-moderation';

const submitFanWorkSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多100字'),
  description: z.string().max(500, '描述最多500字').optional().nullable(),
  type: z.enum(['image', 'video'], { message: '类型只支持图片或视频' }),
  cover: z.string().min(1, '封面不能为空'),
  contentUrl: z.string().optional().nullable(),
  images: z.array(z.string()).min(1, '至少上传一个文件').max(20, '最多上传20个文件'),
});

// 用户投稿二创作品
export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const body = await req.json();
    const parsed = submitFanWorkSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const { images, ...data } = parsed.data;

    // 查询用户信息用于作者名/头像
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, avatar: true, isActive: true },
    });
    if (!user || !user.isActive) return fail('用户不存在或已被禁用', 401);

    // 文本审核（标题 + 描述）
    const textToCheck = [data.title, data.description].filter(Boolean).join(' ');
    const textMod = await moderateText(textToCheck);

    // 确认违规 → 直接拒绝
    if (!textMod.pass && !textMod.needsReview) {
      return fail(`内容审核未通过：${textMod.detail || '内容违规'}，请修改后重新投稿`);
    }

    // 机审通过 → 直接上线；审核异常/待复核 → pending 待人工
    const autoApproved = textMod.pass;
    const fanWork = await prisma.fanWork.create({
      data: {
        ...data,
        images: JSON.stringify(images),
        authorName: user.name,
        authorAvatar: user.avatar,
        userId: user.id,
        status: autoApproved ? 'approved' : 'pending',
        isActive: autoApproved,
      },
    });

    // 审核结果落库
    saveModerationLog({
      targetType: 'fan_work',
      targetId: fanWork.id,
      action: 'text_moderation',
      result: textMod.pass ? 'pass' : (textMod.needsReview ? 'review' : 'block'),
      label: textMod.label,
      score: textMod.score,
      detail: textMod.detail,
    }).catch(() => {});

    const message = autoApproved ? '投稿成功，作品已发布' : '投稿成功，内容待审核后将公开展示';
    return ok(fanWork, message);
  } catch (err) {
    return handleError(err);
  }
}

// 查询我的投稿列表
export async function GET(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) return fail('未登录', 401);

    const works = await prisma.fanWork.findMany({
      where: { userId: payload.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        cover: true,
        status: true,
        rejectReason: true,
        isFeatured: true,
        createdAt: true,
      },
    });

    return ok(works);
  } catch (err) {
    return handleError(err);
  }
}
