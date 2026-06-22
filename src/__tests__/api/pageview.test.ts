import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    pageView: { create: vi.fn().mockResolvedValue({}) },
  },
}));

// rate-limit 默认放行，特定用例再覆盖为超限
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null),
  getClientIp: vi.fn(() => '1.2.3.4'),
}));

import { POST } from '@/app/api/pageview/route';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

const mockCreate = vi.mocked(prisma.pageView.create);
const mockCheckRateLimit = vi.mocked(checkRateLimit);

function makeReq(body: unknown) {
  return new Request('http://localhost/api/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'UnitTest/1.0' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue(null);
});

describe('POST /api/pageview', () => {
  // ========== 正常流程 ==========
  it('test_pageview_validPath_createsRecord', async () => {
    const res = await POST(makeReq({ path: '/profile' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ path: '/profile', ip: '1.2.3.4' }),
    }));
  });

  it('test_pageview_pathWithQuery_createsRecord', async () => {
    const res = await POST(makeReq({ path: '/search?q=test&page=2' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  // ========== 输入校验拒绝 ==========
  it('test_pageview_missingPath_silentlyDropped', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(200); // 不暴露 400
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_emptyPath_silentlyDropped', async () => {
    const res = await POST(makeReq({ path: '' }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_nonStringPath_silentlyDropped', async () => {
    const res = await POST(makeReq({ path: 12345 }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_pathNotStartingWithSlash_silentlyDropped', async () => {
    const res = await POST(makeReq({ path: 'community' }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_pathTooLong_silentlyDropped', async () => {
    const longPath = '/' + 'a'.repeat(300);
    const res = await POST(makeReq({ path: longPath }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_pathWithIllegalChars_silentlyDropped', async () => {
    // 空格、角括号、引号等不允许
    for (const bad of ['/a b', '/foo<script>', '/"xss"', '/path\x00null']) {
      mockCreate.mockClear();
      const res = await POST(makeReq({ path: bad }));
      expect(res.status).toBe(200);
      expect(mockCreate).not.toHaveBeenCalled();
    }
  });

  it('test_pageview_malformedJson_silentlyDropped', async () => {
    const req = new Request('http://localhost/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    }) as unknown as Parameters<typeof POST>[0];
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ========== 限流 ==========
  it('test_pageview_rateLimited_silentlyDropped', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(30); // 剩余 30 秒
    const res = await POST(makeReq({ path: '/profile' }));
    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('test_pageview_rateLimitUsesCorrectNamespace', async () => {
    await POST(makeReq({ path: '/profile' }));
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      '1.2.3.4',
      expect.objectContaining({ namespace: 'pageview', max: 60, windowMs: 60_000 }),
    );
  });
});
