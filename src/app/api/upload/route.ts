import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES, ...VIDEO_TYPES];

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'general';

    if (!file) {
      return fail('请选择文件');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail('不支持的文件格式');
    }

    const isAudio = AUDIO_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return fail(`文件大小不能超过${isVideo ? '100' : isAudio ? '50' : '10'}MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadBuffer(buffer, file.name, file.type, category);

    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: result.url,
        cosKey: result.cosKey,
        size: result.size,
        mimeType: file.type,
        category,
      },
    });

    return ok({
      id: media.id,
      url: media.url,
      filename: media.filename,
      size: media.size,
    });
  } catch (err) {
    return handleError(err);
  }
}
