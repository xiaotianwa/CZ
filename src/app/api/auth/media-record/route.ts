import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { isValidCosUrl, moderateImage, moderateVideo } from '@/lib/content-moderation';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

const schema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  cosKey: z.string().min(1),
  size: z.number().positive(),
  mimeType: z.string().min(1),
  category: z.string().default('general'),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const { url, mimeType, cosKey } = parsed.data;

    // 安全校验：URL 必须为合法 COS/CDN 地址
    if (!isValidCosUrl(url)) {
      return fail('非法的文件地址');
    }

    // 安全校验：MIME 类型白名单
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return fail('不支持的文件类型');
    }

    // 安全校验：cosKey 不能包含路径穿越字符
    if (cosKey.includes('..') || cosKey.startsWith('/')) {
      return fail('非法的文件路径');
    }

    const media = await prisma.media.create({
      data: parsed.data,
    });

    // 内容安全审核（预签名上传的文件在此处异步审核）
    const isImage = IMAGE_TYPES.includes(mimeType);
    const isVideo = VIDEO_TYPES.includes(mimeType);
    if (isImage) {
      const modResult = await moderateImage(url);
      if (!modResult.pass) {
        const { deleteObject } = await import('@/lib/cos');
        deleteObject(cosKey).catch(() => {});
        await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
        return fail(`图片审核未通过：${modResult.detail || '内容违规'}，请更换图片`);
      }
    } else if (isVideo) {
      moderateVideo(url).catch(() => {});
    }

    return ok({
      id: media.id,
      url: media.url,
      filename: media.filename,
      size: media.size,
      mimeType: media.mimeType,
    });
  } catch (err) {
    return handleError(err);
  }
}
