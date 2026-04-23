import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 直接针对 describeVideoModerationTask 的集成风格测试：
 * mock 全局 fetch 以避免真实网络调用，验证签名调用、返回值映射、异常吞咽。
 *
 * 注：submitVideoModeration 涉及 dynamic import('@/lib/async-job')，
 * 与 registerAllHandlers 的互相依赖较复杂，集中在 video-moderation.test.ts 覆盖。
 */

vi.mock('@/lib/db', () => ({
  prisma: { moderationLog: { create: vi.fn() } },
}));

import { describeVideoModerationTask } from '@/lib/content-moderation';

const originalFetch = globalThis.fetch;
const originalEnv = {
  id: process.env.COS_SECRET_ID,
  key: process.env.COS_SECRET_KEY,
  enabled: process.env.CONTENT_MODERATION_ENABLED,
};

beforeEach(() => {
  // 确保走到真实调用路径：显式启用 + 有密钥
  process.env.CONTENT_MODERATION_ENABLED = 'true';
  process.env.COS_SECRET_ID = 'AKID-test';
  process.env.COS_SECRET_KEY = 'secret-test';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnv.id === undefined) delete process.env.COS_SECRET_ID;
  else process.env.COS_SECRET_ID = originalEnv.id;
  if (originalEnv.key === undefined) delete process.env.COS_SECRET_KEY;
  else process.env.COS_SECRET_KEY = originalEnv.key;
  if (originalEnv.enabled === undefined) delete process.env.CONTENT_MODERATION_ENABLED;
  else process.env.CONTENT_MODERATION_ENABLED = originalEnv.enabled;
});

function mockFetchJson(body: unknown) {
  globalThis.fetch = vi.fn(async () => ({
    json: async () => body,
  }) as Response) as typeof fetch;
  return globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
}

describe('describeVideoModerationTask', () => {
  // ========== 配置守卫 ==========
  it('test_describeTask_moderationDisabled_returnsPassFinish', async () => {
    process.env.CONTENT_MODERATION_ENABLED = 'false';
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('FINISH');
    expect(res.suggestion).toBe('Pass');
  });

  it('test_describeTask_missingSecrets_returnsPassFinish', async () => {
    delete process.env.COS_SECRET_ID;
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('FINISH');
    expect(res.suggestion).toBe('Pass');
  });

  it('test_describeTask_emptyTaskId_returnsError', async () => {
    const res = await describeVideoModerationTask('');
    expect(res.status).toBe('ERROR');
    expect(res.error).toContain('missing');
  });

  // ========== 正常路径 ==========
  it('test_describeTask_pending_returnsStatusPending', async () => {
    mockFetchJson({ Response: { Status: 'PENDING' } });
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('PENDING');
  });

  it('test_describeTask_finishPass_mapsCorrectly', async () => {
    mockFetchJson({ Response: { Status: 'FINISH', Suggestion: 'Pass' } });
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('FINISH');
    expect(res.suggestion).toBe('Pass');
    expect(res.detail).toBeUndefined(); // pass 不填 detail
  });

  it('test_describeTask_finishBlock_populatesLabelAndDetail', async () => {
    mockFetchJson({
      Response: { Status: 'FINISH', Suggestion: 'Block', Label: 'Porn', Score: 98 },
    });
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('FINISH');
    expect(res.suggestion).toBe('Block');
    expect(res.label).toBe('Porn');
    expect(res.score).toBe(98);
    expect(res.detail).toBe('色情内容');
  });

  // ========== 异常路径 ==========
  it('test_describeTask_tencentApiError_returnsErrorStatus', async () => {
    mockFetchJson({ Response: { Error: { Code: 'AuthFailure', Message: '签名错误' } } });
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('ERROR');
    expect(res.error).toBe('签名错误');
    expect(res.rawJson).toContain('AuthFailure');
  });

  it('test_describeTask_networkThrows_returnsErrorStatus', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); }) as typeof fetch;
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('ERROR');
    expect(res.error).toContain('network down');
  });

  it('test_describeTask_unknownStatus_defaultsToPending', async () => {
    // 腾讯云如果返回了未识别的 Status 字符串，按保守策略视为 PENDING 继续轮询
    mockFetchJson({ Response: { Status: 'WEIRD' } });
    const res = await describeVideoModerationTask('t1');
    expect(res.status).toBe('PENDING');
  });

  // ========== 签名 API 调用 ==========
  it('test_describeTask_sendsCorrectRequest', async () => {
    const fetchMock = mockFetchJson({ Response: { Status: 'PENDING' } });
    await describeVideoModerationTask('my-task');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://vm.tencentcloudapi.com',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ TaskId: 'my-task' }),
      }),
    );
    // 签名头包含 TC3-HMAC-SHA256
    const req = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(req.headers['Authorization']).toContain('TC3-HMAC-SHA256');
    expect(req.headers['X-TC-Action']).toBe('DescribeTaskDetail');
  });
});
