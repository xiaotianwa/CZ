import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';
import { moderateImage } from '@/lib/content-moderation';
import { validateFileType } from '@/lib/file-validation';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return fail('请选择文件');
    }

    if (file.size > MAX_SIZE) {
      return fail('头像大小不能超过2MB');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail('仅支持 JPG/PNG/WebP 格式');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 安全校验：验证文件头魔数与声明 MIME 类型一致
    if (!validateFileType(buffer, file.type)) {
      return fail('文件内容与声明格式不匹配，请勿伪造文件类型');
    }

    const result = await uploadBuffer(buffer, file.name, file.type, 'avatar');

    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: result.url,
        cosKey: result.cosKey,
        size: result.size,
        mimeType: file.type,
        category: 'avatar',
      },
    });

    // 内容安全审核
    const modResult = await moderateImage(media.url);
    if (!modResult.pass) {
      const { deleteObject } = await import('@/lib/cos');
      deleteObject(result.cosKey).catch(() => {});
      await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
      return fail(`头像审核未通过：${modResult.detail || '内容违规'}，请更换图片`);
    }

    await prisma.user.update({
      where: { id: payload.id },
      data: { avatar: media.url },
    });

    return ok({ url: media.url });
  } catch (err) {
    return handleError(err);
  }
}
