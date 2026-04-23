import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadBuffer } from '@/lib/cos';
import { ok, fail, handleError } from '@/lib/api';
import { moderateImage, submitVideoModeration } from '@/lib/content-moderation';
import { validateFileType } from '@/lib/file-validation';

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

    // 安全校验：验证文件头魔数与声明 MIME 类型一致
    if (!validateFileType(buffer, file.type)) {
      activeUploads--;
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
        ownerId: payload.id,
        source: 'server_upload',
      },
    });

    // 内容安全审核
    if (!isVideo) {
      const modResult = await moderateImage(media.url);
      if (!modResult.pass) {
        // 违规：删除已上传文件，拒绝请求
        const { deleteObject } = await import('@/lib/cos');
        deleteObject(result.cosKey).catch(() => {});
        await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
        activeUploads--;
        return fail(`图片审核未通过：${modResult.detail || '内容违规'}，请更换图片`);
      }
    } else {
      // 视频异步审核：提交腾讯云 VM 任务 + 轮询 job 入队（失败静默不阻塞响应）
      submitVideoModeration({ mediaId: media.id, videoUrl: media.url }).catch(() => {});
    }

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
