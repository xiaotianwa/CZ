/**
 * TCG 后台图片上传
 *
 * 与社区 /api/upload 隔离：
 *   - 鉴权走 requireTcgOps（只有 tcg_super/tcg_ops 可用）
 *   - category 锁为 'cards'，确保文件落在 COS 的 cards/yyyy/mm/dd/ 目录
 *   - 只接受图片（卡牌图）：jpg/png/webp
 *   - 文件大小 8MB 上限（一张卡牌图正常 < 2MB）
 *   - 做文件头魔数校验 + 可选内容安全审核
 *   - 不入库 Media 表（TCG 体系独立，后续 TcgMedia 模型可拓展；当前仅返回 URL）
 *
 * 返回：{ url, cosKey, size, filename }
 * CardForm 拿到 url 后写入 imagePath，保存即可
 */
import { NextRequest } from 'next/server';
import { requireTcgOps } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { uploadBuffer } from '@/lib/cos';
import { validateFileType } from '@/lib/file-validation';
import { moderateImage } from '@/lib/content-moderation';
import { ok, fail, handleError } from '@/lib/api';

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const admin = await requireTcgOps(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return fail('请选择文件');

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail('仅支持 JPG / PNG / WebP 图片');
    }
    if (file.size > MAX_SIZE) {
      return fail('图片大小不能超过 8MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 魔数校验：防止伪造 MIME
    if (!validateFileType(buffer, file.type)) {
      return fail('文件内容与声明格式不匹配');
    }

    // 上传到 COS 的 cards/yyyy/mm/dd/ 目录（与 scripts/upload-cards.js 保持同目录前缀）
    const result = await uploadBuffer(buffer, file.name, file.type, 'cards');

    // 内容安全审核（开关由 CONTENT_MODERATION_ENABLED 控制；未开通时直接放行）
    const modResult = await moderateImage(result.url).catch(() => ({ pass: true, detail: '' }));
    if (!modResult.pass) {
      // 违规 → 回滚删除已上传文件
      const { deleteObject } = await import('@/lib/cos');
      deleteObject(result.cosKey).catch(() => {});
      return fail(`图片审核未通过：${modResult.detail || '内容违规'}，请更换图片`);
    }

    // 审计（只记元数据，不记图片二进制）
    await auditLog({
      operatorId: admin.id,
      action: 'card.upload_image',
      targetType: 'card_image',
      targetId: result.cosKey,
      after: { url: result.url, size: result.size, filename: file.name, mimeType: file.type },
      req,
    });

    return ok({
      url: result.url,
      cosKey: result.cosKey,
      size: result.size,
      filename: file.name,
    });
  } catch (err) {
    return handleError(err);
  }
}
