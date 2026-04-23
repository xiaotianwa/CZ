import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 统一 mock：prisma、async-job、content-moderation
vi.mock('@/lib/db', () => ({
  prisma: {
    media: { update: vi.fn() },
    moderationLog: { create: vi.fn() },
  },
}));

vi.mock('@/lib/async-job', () => ({
  enqueueJob: vi.fn(),
  registerJobHandler: vi.fn(),
}));

vi.mock('@/lib/content-moderation', () => ({
  describeVideoModerationTask: vi.fn(),
  saveModerationLog: vi.fn(),
}));

// 其他 handler 依赖的 mock（避免 registerAllHandlers 时报错）
vi.mock('@/lib/points', () => ({ grantPoints: vi.fn() }));
vi.mock('@/lib/notification', () => ({ notifyComment: vi.fn() }));
vi.mock('@/lib/hot-score', () => ({ updatePostHotScore: vi.fn() }));

import { registerAllHandlers, VIDEO_MODERATION_MAX_POLLS, VIDEO_MODERATION_POLL_INTERVAL_MS } from '@/lib/job-handlers';
import { registerJobHandler, enqueueJob } from '@/lib/async-job';
import { describeVideoModerationTask, saveModerationLog } from '@/lib/content-moderation';
import { prisma } from '@/lib/db';

const mockRegister = vi.mocked(registerJobHandler);
const mockEnqueueJob = vi.mocked(enqueueJob);
const mockDescribeTask = vi.mocked(describeVideoModerationTask);
const mockSaveLog = vi.mocked(saveModerationLog);
const mockMediaUpdate = vi.mocked(prisma.media.update);

/**
 * 提取已注册的 video_moderation handler。
 * registerAllHandlers 内部会调用 registerJobHandler 多次，找 type='video_moderation' 的那次
 */
function getVideoModerationHandler(): (payload: Record<string, unknown>) => Promise<void> {
  const calls = mockRegister.mock.calls;
  const call = calls.find((c) => c[0] === 'video_moderation');
  if (!call) throw new Error('video_moderation handler 未注册');
  return call[1] as (p: Record<string, unknown>) => Promise<void>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnqueueJob.mockResolvedValue('job-id-new' as never);
  mockMediaUpdate.mockResolvedValue({} as never);
  mockSaveLog.mockResolvedValue(undefined);
  // 每个用例重新注册 handler（clearAllMocks 后 mock 调用历史已清空）
  registerAllHandlers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('job-handlers · video_moderation', () => {
  // ========== 参数校验 ==========
  it('test_videoModeration_missingTaskId_skipsSilently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = getVideoModerationHandler();
    await handler({ mediaId: 'm1' }); // 缺 taskId
    expect(mockDescribeTask).not.toHaveBeenCalled();
    expect(mockSaveLog).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('test_videoModeration_missingMediaId_skipsSilently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = getVideoModerationHandler();
    await handler({ taskId: 't1' });
    expect(mockDescribeTask).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // ========== FINISH + Pass ==========
  it('test_videoModeration_finishPass_updatesMediaToApproved', async () => {
    mockDescribeTask.mockResolvedValueOnce({
      status: 'FINISH',
      suggestion: 'Pass',
      rawJson: '{"Suggestion":"Pass"}',
    });
    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1' });

    expect(mockMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'approved' },
    });
    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({
      targetType: 'media',
      targetId: 'm1',
      action: 'video_moderation',
      result: 'pass',
      taskId: 't1',
    }));
    expect(mockEnqueueJob).not.toHaveBeenCalled();
  });

  // ========== FINISH + Block ==========
  it('test_videoModeration_finishBlock_updatesMediaToRejected', async () => {
    mockDescribeTask.mockResolvedValueOnce({
      status: 'FINISH',
      suggestion: 'Block',
      label: 'Porn',
      score: 95,
      detail: '色情内容',
    });
    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1' });

    expect(mockMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'rejected' },
    });
    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({
      result: 'block',
      label: 'Porn',
      score: 95,
      detail: '色情内容',
    }));
  });

  // ========== FINISH + Review ==========
  it('test_videoModeration_finishReview_keepsMediaScanning', async () => {
    mockDescribeTask.mockResolvedValueOnce({
      status: 'FINISH',
      suggestion: 'Review',
      label: 'Ad',
    });
    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1' });

    expect(mockMediaUpdate).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { status: 'scanning' },
    });
    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({
      result: 'review',
    }));
  });

  // ========== PENDING → 重新入队 ==========
  it('test_videoModeration_pending_enqueuesNextPollWithDelay', async () => {
    mockDescribeTask.mockResolvedValueOnce({ status: 'PENDING' });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1', pollCount: 3 });

    expect(mockMediaUpdate).not.toHaveBeenCalled();
    expect(mockSaveLog).not.toHaveBeenCalled();
    expect(mockEnqueueJob).toHaveBeenCalledTimes(1);
    const call = mockEnqueueJob.mock.calls[0][0];
    expect(call.type).toBe('video_moderation');
    expect(call.payload).toEqual({ taskId: 't1', mediaId: 'm1', pollCount: 4 });
    expect(call.idempotencyKey).toBe('video_moderation:t1:4');
    expect(call.scheduledAt).toBeInstanceOf(Date);
    // scheduledAt ≈ now + 60s
    const delta = call.scheduledAt!.getTime() - new Date('2026-01-01T00:00:00Z').getTime();
    expect(delta).toBe(VIDEO_MODERATION_POLL_INTERVAL_MS);
  });

  it('test_videoModeration_pendingFirstPoll_pollCountDefaultsToZero', async () => {
    mockDescribeTask.mockResolvedValueOnce({ status: 'PENDING' });
    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1' }); // 无 pollCount
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { taskId: 't1', mediaId: 'm1', pollCount: 1 },
        idempotencyKey: 'video_moderation:t1:1',
      }),
    );
  });

  // ========== PENDING + 轮询次数超限 ==========
  it('test_videoModeration_exceedsMaxPolls_marksForHumanReview', async () => {
    await getVideoModerationHandler()({
      taskId: 't1',
      mediaId: 'm1',
      pollCount: VIDEO_MODERATION_MAX_POLLS,
    });

    expect(mockDescribeTask).not.toHaveBeenCalled();
    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({
      result: 'review',
      detail: expect.stringContaining('仍未完成'),
    }));
  });

  // ========== ERROR ==========
  it('test_videoModeration_error_logsErrorAndKeepsScanning', async () => {
    mockDescribeTask.mockResolvedValueOnce({
      status: 'ERROR',
      error: '鉴权失败',
      rawJson: '{"Error":"..."}',
    });
    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'm1' });

    expect(mockMediaUpdate).not.toHaveBeenCalled();
    expect(mockEnqueueJob).not.toHaveBeenCalled();
    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({
      result: 'error',
      detail: '鉴权失败',
      rawJson: '{"Error":"..."}',
    }));
  });

  // ========== 幂等键设计 ==========
  it('test_videoModeration_idempotencyKeyIncludesPollCount', async () => {
    mockDescribeTask.mockResolvedValueOnce({ status: 'PENDING' });
    await getVideoModerationHandler()({ taskId: 'xxx', mediaId: 'm1', pollCount: 9 });
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'video_moderation:xxx:10' }),
    );
  });

  // ========== Media.update 失败不影响 log 落库 ==========
  it('test_videoModeration_mediaUpdateFails_stillWritesLog', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockMediaUpdate.mockRejectedValueOnce(new Error('Media not found'));
    mockDescribeTask.mockResolvedValueOnce({ status: 'FINISH', suggestion: 'Pass' });

    await getVideoModerationHandler()({ taskId: 't1', mediaId: 'missing' });

    expect(mockSaveLog).toHaveBeenCalledWith(expect.objectContaining({ result: 'pass' }));
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
