/**
 * 异步任务处理器注册
 * 在 worker 启动时调用 registerAllHandlers() 完成注册
 */

import { registerJobHandler, enqueueJob } from '@/lib/async-job';
import { grantPoints, type PointAction } from '@/lib/points';
import { notifyComment } from '@/lib/notification';
import { updatePostHotScore } from '@/lib/hot-score';
import { describeVideoModerationTask, saveModerationLog } from '@/lib/content-moderation';
import { prisma } from '@/lib/db';

/** 视频审核轮询最大次数，避免 AsyncJob 表无限增长 */
export const VIDEO_MODERATION_MAX_POLLS = 20;
/** 下一次轮询延迟（毫秒） */
export const VIDEO_MODERATION_POLL_INTERVAL_MS = 60_000;

export interface VideoModerationJobPayload {
  /** 腾讯云 VM 返回的 JobId / TaskId */
  taskId: string;
  /** 关联 Media.id，用于回写 status 与审计 */
  mediaId: string;
  /** 当前已完成的轮询次数，从 0 开始 */
  pollCount?: number;
}

export function registerAllHandlers() {
  // 积分发放
  registerJobHandler('grant_points', async (payload) => {
    const { userId, action, detail } = payload as {
      userId: string;
      action: PointAction;
      detail?: string;
    };
    await grantPoints(userId, action, detail);
  });

  // 评论通知
  registerJobHandler('notify_comment', async (payload) => {
    const { postAuthorId, commenter, postId, commentContent } = payload as {
      postAuthorId: string;
      commenter: { id: string; name: string; avatar?: string | null };
      postId: string;
      commentContent: string;
    };
    await notifyComment(postAuthorId, commenter, postId, commentContent);
  });

  // 热度更新
  registerJobHandler('update_hot_score', async (payload) => {
    const { postId } = payload as { postId: string };
    await updatePostHotScore(postId);
  });

  // 视频审核结果轮询：查询腾讯云 VM → 更新 Media.status + ModerationLog → PENDING 则重新入队
  registerJobHandler('video_moderation', async (payload) => {
    const { taskId, mediaId, pollCount = 0 } = payload as unknown as VideoModerationJobPayload;

    if (!taskId || !mediaId) {
      console.warn('[video_moderation] 任务缺少 taskId 或 mediaId，跳过:', payload);
      return;
    }

    // 超过最大轮询次数：标记 Media 为 scanning 状态（待人工介入）并落错误日志
    if (pollCount >= VIDEO_MODERATION_MAX_POLLS) {
      await saveModerationLog({
        targetType: 'media',
        targetId: mediaId,
        action: 'video_moderation',
        result: 'review',
        taskId,
        detail: `轮询 ${VIDEO_MODERATION_MAX_POLLS} 次仍未完成，需人工复核`,
      });
      return;
    }

    const result = await describeVideoModerationTask(taskId);

    // PENDING → 延迟 60s 后重新入队一个新的 job（pollCount+1）
    if (result.status === 'PENDING') {
      await enqueueJob({
        type: 'video_moderation',
        payload: { taskId, mediaId, pollCount: pollCount + 1 },
        scheduledAt: new Date(Date.now() + VIDEO_MODERATION_POLL_INTERVAL_MS),
        // 幂等键包含 pollCount，避免 worker 重试写重复 job；同一轮只入一次
        idempotencyKey: `video_moderation:${taskId}:${pollCount + 1}`,
      });
      return;
    }

    // ERROR → 腾讯云处理失败，落错误日志但不改 Media 状态（保留 scanning，让管理员手动处理）
    if (result.status === 'ERROR') {
      await saveModerationLog({
        targetType: 'media',
        targetId: mediaId,
        action: 'video_moderation',
        result: 'error',
        taskId,
        detail: result.error || '腾讯云视频审核失败',
        rawJson: result.rawJson ?? null,
      });
      return;
    }

    // FINISH → 根据 suggestion 更新 Media.status 与 ModerationLog
    // 腾讯云返回 Pass/Block/Review，按以下映射：
    //   Pass   → Media.status=approved, ModerationLog.result=pass
    //   Block  → Media.status=rejected, ModerationLog.result=block
    //   Review → Media.status 保持 scanning, ModerationLog.result=review（交人工）
    const suggestion = result.suggestion || 'Review';
    const nextMediaStatus = suggestion === 'Pass' ? 'approved' : suggestion === 'Block' ? 'rejected' : 'scanning';
    const logResult = suggestion === 'Pass' ? 'pass' : suggestion === 'Block' ? 'block' : 'review';

    await prisma.media.update({
      where: { id: mediaId },
      data: { status: nextMediaStatus },
    }).catch((err) => {
      console.error('[video_moderation] 更新 Media.status 失败:', err);
    });

    await saveModerationLog({
      targetType: 'media',
      targetId: mediaId,
      action: 'video_moderation',
      result: logResult,
      label: result.label ?? null,
      score: result.score ?? null,
      detail: result.detail ?? null,
      taskId,
      rawJson: result.rawJson ?? null,
    });
  });
}
