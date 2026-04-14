import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';
import { moderateImage, moderateVideo } from '@/lib/content-moderation';
import { validateFileType } from '@/lib/file-validation';

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

    // 安全校验：验证文件头魔数与声明 MIME 类型一致
    if (!validateFileType(buffer, file.type)) {
      return fail('文件内容与声明格式不匹配，请勿伪造文件类型');
    }

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

    // 内容安全审核（管理员上传也需合规）
    const isImage = IMAGE_TYPES.includes(file.type);
    if (isImage) {
      const modResult = await moderateImage(media.url);
      if (!modResult.pass) {
        const { deleteObject } = await import('@/lib/cos');
        deleteObject(result.cosKey).catch(() => {});
        await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
        return fail(`图片审核未通过：${modResult.detail || '内容违规'}，请更换图片`);
      }
    } else if (isVideo) {
      moderateVideo(media.url).catch(() => {});
    }

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
