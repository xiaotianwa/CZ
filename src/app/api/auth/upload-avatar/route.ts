import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';

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

    await prisma.user.update({
      where: { id: payload.id },
      data: { avatar: media.url },
    });

    return ok({ url: media.url });
  } catch (err) {
    return handleError(err);
  }
}
