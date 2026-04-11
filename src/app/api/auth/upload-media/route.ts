import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;   // 50MB

// 并发保护：限制同时进行的上传数
let activeUploads = 0;
const MAX_CONCURRENT_UPLOADS = 5;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
      return fail('服务器繁忙，请稍后再试或使用客户端直传', 503);
    }
    activeUploads++;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return fail('请选择文件');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail('仅支持 JPG/PNG/WebP/GIF 图片和 MP4/WebM 视频');
    }

    const isVideo = VIDEO_TYPES.includes(file.type);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxLabel = isVideo ? '50MB' : '5MB';

    if (file.size > maxSize) {
      return fail(`文件大小不能超过${maxLabel}`);
    }

    const category = isVideo ? 'post-video' : 'post-image';
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

    activeUploads--;
    return ok({
      id: media.id,
      url: media.url,
      filename: media.filename,
      size: media.size,
      mimeType: media.mimeType,
      type: isVideo ? 'video' : 'image',
    });
  } catch (err) {
    activeUploads--;
    return handleError(err);
  }
}
