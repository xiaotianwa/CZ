import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getPresignedUploadUrl } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;   // 50MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;   // 20MB

const ALLOWED_CATEGORIES = ['avatar', 'cover', 'game', 'media'];

const schema = z.object({
  filename: z.string().min(1, '文件名不能为空'),
  mimeType: z.string().min(1, 'MIME 类型不能为空'),
  size: z.number().positive('文件大小无效'),
  category: z.string().default('media'),
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

    const { filename, mimeType, size, category } = parsed.data;

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return fail('不支持的文件类型');
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return fail('不支持的文件分类');
    }

    // 校验文件大小
    const isVideo = VIDEO_TYPES.includes(mimeType);
    const isAudio = AUDIO_TYPES.includes(mimeType);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? '50MB' : isAudio ? '20MB' : '5MB';

    if (size > maxSize) {
      return fail(`文件大小不能超过${maxLabel}`);
    }

    const result = await getPresignedUploadUrl(filename, mimeType, category);

    return ok({
      uploadUrl: result.uploadUrl,
      cosKey: result.cosKey,
      fileUrl: result.fileUrl,
      mimeType,
    });
  } catch (err) {
    return handleError(err);
  }
}
