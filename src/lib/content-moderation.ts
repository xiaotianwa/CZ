/**
 * 内容安全审核模块
 * 集成腾讯云天御内容安全 API，对用户上传的图片/视频进行违规检测
 *
 * 需要环境变量:
 *   COS_SECRET_ID / COS_SECRET_KEY — 复用 COS 密钥（需开通内容安全权限）
 *   CONTENT_MODERATION_ENABLED — 'true' 强制启用，'false' 强制关闭，未配置时生产默认启用、开发/测试默认关闭
 *
 * 腾讯云内容安全文档: https://cloud.tencent.com/document/product/1125
 */

import { createHmac, createHash } from 'crypto';
import { prisma } from '@/lib/db';

function getSecretId() { return process.env.COS_SECRET_ID || ''; }
function getSecretKey() { return process.env.COS_SECRET_KEY || ''; }

/**
 * 是否启用内容审核。
 * - CONTENT_MODERATION_ENABLED='true' → 强制启用
 * - CONTENT_MODERATION_ENABLED='false' → 强制关闭
 * - 未显式配置 → 生产环境默认启用（安全默认值，防漏配导致合规事故），
 *   非生产环境（dev/test）默认关闭，便于本地开发与单元测试不触达腾讯云 API。
 * 注：密钥缺失时各 moderate* 函数会进一步降级为放行并打 warn 日志。
 */
export function isModerationEnabled() {
  const explicit = process.env.CONTENT_MODERATION_ENABLED;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return process.env.NODE_ENV === 'production';
}
function getModerationRegion() { return process.env.MODERATION_REGION || 'ap-guangzhou'; }

export interface ModerationResult {
  pass: boolean;
  needsReview?: boolean; // true = 审核异常/超时，内容应待人工审核
  label?: string;   // 违规标签: Porn | Polity | Terror | Ad | Abuse 等
  score?: number;    // 置信度 0-100
  detail?: string;   // 人类可读描述
}

/**
 * 将审核结果落库到 ModerationLog
 */
export async function saveModerationLog(params: {
  targetType: string;
  targetId: string;
  action: string;
  result: string;
  label?: string | null;
  score?: number | null;
  detail?: string | null;
  taskId?: string | null;
  rawJson?: string | null;
  provider?: string;
}) {
  try {
    await prisma.moderationLog.create({
      data: {
        targetType: params.targetType,
        targetId: params.targetId,
        action: params.action,
        result: params.result,
        label: params.label || null,
        score: params.score ?? null,
        detail: params.detail || null,
        taskId: params.taskId || null,
        rawJson: params.rawJson || null,
        provider: params.provider || 'tencent',
      },
    });
  } catch (err) {
    console.error('[ModerationLog] 落库失败:', err);
  }
}

// ===================== 腾讯云 API 签名 V3 =====================

function sha256Hex(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

function hmacSha256(key: string | Buffer, message: string): Buffer {
  return createHmac('sha256', key).update(message).digest();
}

function buildTencentCloudHeaders(
  service: string,
  action: string,
  payload: string,
  region: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const hashedPayload = sha256Hex(payload);
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${service}.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';

  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join('\n');

  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    'TC3-HMAC-SHA256',
    timestamp.toString(),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const secretDate = hmacSha256(`TC3${getSecretKey()}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  const authorization = `TC3-HMAC-SHA256 Credential=${getSecretId()}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json',
    'Host': `${service}.tencentcloudapi.com`,
    'X-TC-Action': action,
    'X-TC-Version': '2020-12-29',
    'X-TC-Timestamp': timestamp.toString(),
    'X-TC-Region': region,
    'Authorization': authorization,
  };
}

// ===================== 图片审核 =====================

/**
 * 审核图片内容是否违规
 * @param imageUrl 图片的公网可访问 URL
 * @returns ModerationResult
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  if (!isModerationEnabled()) {
    return { pass: true };
  }

  if (!getSecretId() || !getSecretKey()) {
    console.warn('[内容审核] 未配置密钥，跳过审核');
    return { pass: true };
  }

  try {
    const payload = JSON.stringify({
      FileUrl: imageUrl,
    });

    const headers = buildTencentCloudHeaders('ims', 'ImageModeration', payload, getModerationRegion());

    const res = await fetch(`https://ims.tencentcloudapi.com`, {
      method: 'POST',
      headers,
      body: payload,
    });

    const data = await res.json();
    const response = data?.Response;

    if (response?.Error) {
      console.error('[内容审核] 图片审核 API 错误:', response.Error);
      return { pass: false, needsReview: true, detail: '审核服务异常，内容待人工审核' };
    }

    // Suggestion: Block / Review / Pass
    const suggestion = response?.Suggestion || 'Pass';
    if (suggestion === 'Pass') {
      return { pass: true };
    }

    return {
      pass: false,
      label: response?.Label || 'Unknown',
      score: response?.Score || 0,
      detail: getReadableLabel(response?.Label),
    };
  } catch (err) {
    console.error('[内容审核] 图片审核异常:', err);
    return { pass: false, needsReview: true, detail: '审核服务异常，内容待人工审核' };
  }
}

// ===================== 视频审核（异步任务） =====================

/**
 * 提交视频审核任务（异步）
 * 视频审核是异步的，提交后通过回调或轮询获取结果
 * 对于社区场景，建议先发布后审核，违规后自动下架
 *
 * @param videoUrl 视频的公网可访问 URL
 * @returns taskId 或审核结果
 */
export async function moderateVideo(videoUrl: string): Promise<ModerationResult & { taskId?: string }> {
  if (!isModerationEnabled()) {
    return { pass: true };
  }

  if (!getSecretId() || !getSecretKey()) {
    console.warn('[内容审核] 未配置密钥，跳过审核');
    return { pass: true };
  }

  try {
    // 腾讯云 VM CreateVideoModerationTask 规范：Tasks 为数组，每个任务带 DataId 便于后续关联
    // 文档：https://cloud.tencent.com/document/api/1265/51859
    const reqBody = JSON.stringify({
      Tasks: [{ DataId: `cz-${Date.now()}`, Url: videoUrl }],
    });

    const headers = buildTencentCloudHeaders('vm', 'CreateVideoModerationTask', reqBody, getModerationRegion());

    const res = await fetch(`https://vm.tencentcloudapi.com`, {
      method: 'POST',
      headers,
      body: reqBody,
    });

    const data = await res.json();
    const response = data?.Response;

    if (response?.Error) {
      console.error('[内容审核] 视频审核 API 错误:', response.Error);
      return { pass: false, needsReview: true, detail: '视频审核服务异常，内容待人工审核' };
    }

    // CreateVideoModerationTask 可能返回 Results[0].JobId 或 TaskId（兼容写法）
    const jobId = response?.Results?.[0]?.JobId
      || response?.JobId
      || response?.TaskId
      || undefined;

    // 视频审核是异步任务，返回 taskId（供轮询使用）
    return {
      pass: true, // 异步审核已提交（真正结果由 video_moderation job 落库）
      needsReview: true, // 结果未返回前标记待审核
      taskId: jobId,
    };
  } catch (err) {
    console.error('[内容审核] 视频审核异常:', err);
    return { pass: false, needsReview: true, detail: '视频审核服务异常，内容待人工审核' };
  }
}

// ==================== 视频审核结果查询 ====================

export type VideoModerationTaskStatus = 'PENDING' | 'FINISH' | 'ERROR';

export interface VideoModerationTaskResult {
  /** 任务状态：PENDING 表示仍在处理；FINISH 表示有结论；ERROR 表示腾讯云处理失败 */
  status: VideoModerationTaskStatus;
  /** 审核建议：Pass/Block/Review（仅 status=FINISH 时有意义） */
  suggestion?: 'Pass' | 'Block' | 'Review';
  /** 违规主标签：Porn | Polity | Terror | Ad | Abuse 等 */
  label?: string;
  /** 置信度 0-100 */
  score?: number;
  /** 人类可读说明 */
  detail?: string;
  /** 供应商原始返回 JSON（便于存档审计） */
  rawJson?: string;
  /** 查询层面的错误信息（网络/鉴权异常等，与 status='ERROR' 合用） */
  error?: string;
}

/**
 * 查询视频审核任务结果（腾讯云 VM DescribeTaskDetail）
 *
 * 轮询策略由调用方（video_moderation job handler）控制：
 *  - PENDING → 调用方应重新入队一个延迟 60s 的 job 继续轮询
 *  - FINISH  → 调用方根据 suggestion 更新 Media.status
 *  - ERROR   → 调用方应记录日志并将 Media 标记待人工复核
 *
 * 若模块未启用或密钥缺失，直接返回 FINISH+Pass 的"放行"结果以与 moderateVideo 一致。
 */
export async function describeVideoModerationTask(taskId: string): Promise<VideoModerationTaskResult> {
  if (!isModerationEnabled()) {
    return { status: 'FINISH', suggestion: 'Pass' };
  }
  if (!getSecretId() || !getSecretKey()) {
    return { status: 'FINISH', suggestion: 'Pass' };
  }
  if (!taskId) {
    return { status: 'ERROR', error: 'missing taskId' };
  }

  try {
    const reqBody = JSON.stringify({ TaskId: taskId });
    const headers = buildTencentCloudHeaders('vm', 'DescribeTaskDetail', reqBody, getModerationRegion());

    const res = await fetch('https://vm.tencentcloudapi.com', {
      method: 'POST',
      headers,
      body: reqBody,
    });

    const data = await res.json();
    const response = data?.Response;

    if (response?.Error) {
      console.error('[内容审核] 视频审核查询失败:', response.Error);
      return { status: 'ERROR', error: response.Error.Message || 'tencent cloud error', rawJson: JSON.stringify(response.Error) };
    }

    // 腾讯云 Status: PENDING / FINISH / ERROR；Suggestion: Pass/Block/Review
    const status = String(response?.Status || 'PENDING').toUpperCase() as VideoModerationTaskStatus;
    const suggestion = response?.Suggestion as 'Pass' | 'Block' | 'Review' | undefined;

    return {
      status: status === 'FINISH' || status === 'ERROR' || status === 'PENDING' ? status : 'PENDING',
      suggestion,
      label: response?.Label,
      score: typeof response?.Score === 'number' ? response.Score : undefined,
      detail: suggestion && suggestion !== 'Pass' ? getReadableLabel(response?.Label) : undefined,
      rawJson: JSON.stringify(response),
    };
  } catch (err) {
    console.error('[内容审核] 视频审核查询异常:', err);
    return { status: 'ERROR', error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 提交视频审核任务，并把轮询 job 入队到 AsyncJob。
 *
 * 典型调用时机：用户/管理员视频上传成功、Media 记录已落库之后。
 *  - 调用内部 {@link moderateVideo} 拿到 taskId
 *  - 若拿到 taskId：写入一条 `video_moderation` AsyncJob（延迟 60s 首次轮询）
 *  - 若未拿到 taskId（模块未启用 / 密钥缺失 / 提交失败）：静默返回，media 保持 uploaded 状态
 *
 * 失败不抛错，避免阻塞业务主流程。返回值仅用于日志/调试。
 *
 * 注意：为避免 content-moderation 与 async-job 形成强耦合，本函数通过 dynamic import
 * 加载 @/lib/async-job，允许上游未初始化 worker 时也能编译通过。
 */
export async function submitVideoModeration(params: {
  mediaId: string;
  videoUrl: string;
}): Promise<{ taskId?: string; enqueued: boolean }> {
  try {
    const result = await moderateVideo(params.videoUrl);
    if (!result.taskId) {
      return { enqueued: false };
    }

    const { enqueueJob } = await import('@/lib/async-job');
    await enqueueJob({
      type: 'video_moderation',
      payload: { taskId: result.taskId, mediaId: params.mediaId, pollCount: 0 },
      // 首次轮询延迟 60s，给腾讯云一些处理时间
      scheduledAt: new Date(Date.now() + 60_000),
      idempotencyKey: `video_moderation:${result.taskId}:0`,
    });
    return { taskId: result.taskId, enqueued: true };
  } catch (err) {
    console.error('[内容审核] submitVideoModeration 失败:', err);
    return { enqueued: false };
  }
}

// ===================== 文本审核 =====================

/**
 * 审核文本内容是否违规（与本地违禁词库形成双重保障）
 * @param text 待审核文本
 * @returns ModerationResult
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  const enabled = isModerationEnabled();
  const hasKeys = !!(getSecretId() && getSecretKey());
  console.log('[内容审核] moderateText 调用', { enabled, hasKeys, textLen: text?.length ?? 0 });

  if (!enabled) {
    return { pass: true };
  }

  if (!hasKeys) {
    console.warn('[内容审核] 未配置密钥，跳过文本审核');
    return { pass: true };
  }

  if (!text || text.trim().length === 0) {
    return { pass: true };
  }

  try {
    console.log('[内容审核] 文本审核开始, 文本长度:', text.length);
    const payload = JSON.stringify({
      Content: Buffer.from(text).toString('base64'),
    });

    const headers = buildTencentCloudHeaders('tms', 'TextModeration', payload, getModerationRegion());

    const res = await fetch(`https://tms.tencentcloudapi.com`, {
      method: 'POST',
      headers,
      body: payload,
    });

    const data = await res.json();
    const response = data?.Response;
    console.log('[内容审核] 文本审核响应:', JSON.stringify({ Suggestion: response?.Suggestion, Label: response?.Label, Error: response?.Error }));

    if (response?.Error) {
      console.error('[内容审核] 文本审核 API 错误:', response.Error);
      return { pass: false, needsReview: true, detail: '文本审核服务异常，内容待人工审核' };
    }

    // Suggestion: Block / Review / Pass
    const suggestion = response?.Suggestion || 'Pass';
    if (suggestion === 'Pass') {
      return { pass: true };
    }

    return {
      pass: false,
      label: response?.Label || 'Unknown',
      score: response?.Score || 0,
      detail: getReadableLabel(response?.Label),
    };
  } catch (err) {
    console.error('[内容审核] 文本审核异常:', err);
    return { pass: false, needsReview: true, detail: '文本审核服务异常，内容待人工审核' };
  }
}

// ===================== 批量审核 =====================

/**
 * 批量审核多个媒体文件
 * @param urls 文件 URL 列表
 * @param mimeTypes 对应的 MIME 类型列表
 * @returns 第一个不通过的审核结果，或全部通过
 */
export async function moderateMediaFiles(
  urls: string[],
  mimeTypes: string[]
): Promise<ModerationResult> {
  if (!isModerationEnabled()) {
    return { pass: true };
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const mime = mimeTypes[i] || '';

    if (mime.startsWith('image/')) {
      const result = await moderateImage(url);
      if (!result.pass) return result;
    } else if (mime.startsWith('video/')) {
      // 视频异步审核，此处仅提交任务
      await moderateVideo(url);
    }
  }

  return { pass: true };
}

// ===================== 辅助函数 =====================

function getReadableLabel(label: string | undefined): string {
  const labelMap: Record<string, string> = {
    Porn: '色情内容',
    Polity: '政治敏感内容',
    Terror: '暴恐内容',
    Ad: '广告内容',
    Abuse: '辱骂内容',
    Illegal: '违法内容',
    Spam: '垃圾信息',
    Moan: '娇喘内容',
  };
  return label ? (labelMap[label] || `违规内容(${label})`) : '违规内容';
}

/**
 * 校验 URL 是否为合法的 COS/CDN 域名
 */
export function isValidCosUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const cdnDomain = process.env.COS_CDN_DOMAIN || '';
    const bucket = process.env.COS_BUCKET || '';
    const region = process.env.COS_REGION || '';

    // 匹配 COS 域名
    if (hostname.endsWith('.cos.' + region + '.myqcloud.com')) return true;
    if (bucket && hostname === `${bucket}.cos.${region}.myqcloud.com`) return true;
    // 匹配 CDN 域名
    if (cdnDomain && hostname === cdnDomain) return true;
    // 通用 COS 域名模式
    if (/\.cos\.[a-z-]+\.myqcloud\.com$/.test(hostname)) return true;

    return false;
  } catch {
    return false;
  }
}
