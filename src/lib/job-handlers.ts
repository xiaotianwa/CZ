/**
 * 异步任务处理器注册
 * 在 worker 启动时调用 registerAllHandlers() 完成注册
 */

import { registerJobHandler } from '@/lib/async-job';
import { grantPoints, type PointAction } from '@/lib/points';
import { notifyComment } from '@/lib/notification';
import { updatePostHotScore } from '@/lib/hot-score';

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

  // 视频审核 — 暂留空壳，后续对接异步审核回调
  registerJobHandler('video_moderation', async (_payload) => {
    // TODO: 实现视频审核结果轮询
  });
}
