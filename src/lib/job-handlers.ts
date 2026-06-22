import { registerJobHandler, enqueueJob } from '@/lib/async-job';
import { grantPoints, type PointAction } from '@/lib/points';
import { describeVideoModerationTask, saveModerationLog } from '@/lib/content-moderation';
import { prisma } from '@/lib/db';

export const VIDEO_MODERATION_MAX_POLLS = 20;
export const VIDEO_MODERATION_POLL_INTERVAL_MS = 60_000;

export interface VideoModerationJobPayload {
  taskId: string;
  mediaId: string;
  pollCount?: number;
}

export function registerAllHandlers() {
  registerJobHandler('grant_points', async (payload) => {
    const { userId, action, detail } = payload as {
      userId: string;
      action: PointAction;
      detail?: string;
    };
    await grantPoints(userId, action, detail);
  });

  registerJobHandler('video_moderation', async (payload) => {
    const { taskId, mediaId, pollCount = 0 } = payload as unknown as VideoModerationJobPayload;

    if (!taskId || !mediaId) {
      console.warn('[video_moderation] missing taskId or mediaId', payload);
      return;
    }

    if (pollCount >= VIDEO_MODERATION_MAX_POLLS) {
      await saveModerationLog({
        targetType: 'media',
        targetId: mediaId,
        action: 'video_moderation',
        result: 'review',
        taskId,
        detail: `轮询 ${VIDEO_MODERATION_MAX_POLLS} 次仍未完成，需要人工复核`,
      });
      return;
    }

    const result = await describeVideoModerationTask(taskId);

    if (result.status === 'PENDING') {
      await enqueueJob({
        type: 'video_moderation',
        payload: { taskId, mediaId, pollCount: pollCount + 1 },
        scheduledAt: new Date(Date.now() + VIDEO_MODERATION_POLL_INTERVAL_MS),
        idempotencyKey: `video_moderation:${taskId}:${pollCount + 1}`,
      });
      return;
    }

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

    const suggestion = result.suggestion || 'Review';
    const nextMediaStatus = suggestion === 'Pass' ? 'approved' : suggestion === 'Block' ? 'rejected' : 'scanning';
    const logResult = suggestion === 'Pass' ? 'pass' : suggestion === 'Block' ? 'block' : 'review';

    await prisma.media.update({
      where: { id: mediaId },
      data: { status: nextMediaStatus },
    }).catch((err) => {
      console.error('[video_moderation] failed to update media status:', err);
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
