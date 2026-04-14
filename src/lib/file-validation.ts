/**
 * 文件真实类型校验 — Magic Bytes（文件头魔数）检测
 * 防止客户端伪造 MIME 类型上传恶意文件
 */

interface MagicSignature {
  mime: string;
  offset: number;
  bytes: number[];
}

const SIGNATURES: MagicSignature[] = [
  // 图片
  { mime: 'image/jpeg', offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },  // GIF8
  { mime: 'image/webp', offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP at offset 8
  // 视频
  { mime: 'video/mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },  // ftyp
  { mime: 'video/webm', offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] },
  { mime: 'video/quicktime', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp (same as mp4)
  // 音频
  { mime: 'audio/mpeg', offset: 0, bytes: [0x49, 0x44, 0x33] },       // ID3 tag
  { mime: 'audio/mpeg', offset: 0, bytes: [0xFF, 0xFB] },             // MP3 frame sync
  { mime: 'audio/wav', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },  // RIFF
  { mime: 'audio/ogg', offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53] },  // OggS
  { mime: 'audio/flac', offset: 0, bytes: [0x66, 0x4C, 0x61, 0x43] }, // fLaC
  { mime: 'audio/aac', offset: 0, bytes: [0xFF, 0xF1] },              // AAC ADTS
  { mime: 'audio/aac', offset: 0, bytes: [0xFF, 0xF9] },              // AAC ADTS
  { mime: 'audio/mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },  // ftyp (m4a)
  { mime: 'audio/x-m4a', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
];

/**
 * 根据文件头魔数检测真实 MIME 类型
 * @param buffer 文件内容 Buffer（至少前 16 字节）
 * @returns 检测到的 MIME 类型，或 null（无法识别）
 */
export function detectMimeType(buffer: Buffer): string | null {
  for (const sig of SIGNATURES) {
    if (buffer.length < sig.offset + sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => buffer[sig.offset + i] === b);
    if (match) return sig.mime;
  }
  return null;
}

/**
 * 校验文件声明的 MIME 类型是否与实际文件头匹配
 * @param buffer 文件内容 Buffer
 * @param declaredMime 客户端声明的 MIME 类型
 * @returns true 如果匹配或无法判断（宽容模式），false 如果明确不匹配
 */
export function validateFileType(buffer: Buffer, declaredMime: string): boolean {
  const detected = detectMimeType(buffer);
  if (!detected) {
    // 无法识别文件类型时，依赖白名单过滤（已在上传端点中做了）
    return true;
  }

  // MP4/MOV/M4A 共享 ftyp 头，放宽匹配
  const ftypFamily = ['video/mp4', 'video/quicktime', 'audio/mp4', 'audio/x-m4a'];
  if (ftypFamily.includes(detected) && ftypFamily.includes(declaredMime)) {
    return true;
  }

  // 类型族匹配（如 audio/mpeg 的两种签名）
  const declaredBase = declaredMime.split('/')[0];
  const detectedBase = detected.split('/')[0];

  return declaredBase === detectedBase;
}
