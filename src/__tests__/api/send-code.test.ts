import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// 限流与安全相关依赖全部 mock，聚焦 route 内部的回滚/429 行为
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  rollbackRateLimit: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn(() => '1.1.1.1'),
}));

vi.mock('@/lib/db', () => ({
  prisma: {},
}));

vi.mock('@/lib/mail', () => ({
  sendVerifyCode: vi.fn(),
}));

vi.mock('@/lib/registration-security', () => ({
  createVerificationCode: vi.fn().mockResolvedValue({ id: 'verif-1' }),
  getRequestMeta: vi.fn(() => ({ ip: '1.1.1.1', uaHash: 'ua-hash' })),
  recordSecurityEvent: vi.fn().mockResolvedValue(undefined),
  revokeVerificationCode: vi.fn().mockResolvedValue(undefined),
  validateQuizPassToken: vi.fn().mockResolvedValue({ ok: true }),
}));

import { POST } from '@/app/api/public/send-code/route';
import { checkRateLimit, rollbackRateLimit } from '@/lib/rate-limit';
import { sendVerifyCode } from '@/lib/mail';
import { revokeVerificationCode, recordSecurityEvent } from '@/lib/registration-security';

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockRollbackRateLimit = vi.mocked(rollbackRateLimit);
const mockSendVerifyCode = vi.mocked(sendVerifyCode);
const mockRevokeVerificationCode = vi.mocked(revokeVerificationCode);
const mockRecordSecurityEvent = vi.mocked(recordSecurityEvent);

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/public/send-code', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/public/send-code', () => {
  it('test_sendCode_ipRateLimited_returns429WithMessage', async () => {
    mockCheckRateLimit.mockResolvedValueOnce(42); // IP 超限
    const res = await POST(makeReq({ email: 'a@b.com', type: 'register', quizToken: 't' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.message).toContain('发送过于频繁');
    expect(json.message).toContain('42');
  });

  it('test_sendCode_emailRateLimited_returns429WithMessage', async () => {
    mockCheckRateLimit
      .mockResolvedValueOnce(null) // IP 通过
      .mockResolvedValueOnce(30); // 邮箱超限
    const res = await POST(makeReq({ email: 'a@b.com', type: 'register', quizToken: 't' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.message).toContain('该邮箱已发送验证码');
    expect(json.message).toContain('30');
  });

  it('test_sendCode_mailFailure_rollsBackBothLimitsAndRevokesCode', async () => {
    mockCheckRateLimit.mockResolvedValue(null);
    mockSendVerifyCode.mockRejectedValueOnce(new Error('smtp timeout'));

    const res = await POST(makeReq({ email: 'a@b.com', type: 'register', quizToken: 't' }));

    expect(res.status).toBe(500);
    // 两条限流都必须回滚（IP + 邮箱）
    expect(mockRollbackRateLimit).toHaveBeenCalledTimes(2);
    expect(mockRollbackRateLimit).toHaveBeenCalledWith('1.1.1.1', 'send-code-ip');
    expect(mockRollbackRateLimit).toHaveBeenCalledWith('code:a@b.com', 'send-code-email');
    // 验证码作废
    expect(mockRevokeVerificationCode).toHaveBeenCalledWith(expect.anything(), 'verif-1');
    // 安全事件记录为 error
    expect(mockRecordSecurityEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'send_code', result: 'error', reason: 'mail_send_failed' }),
    );
  });

  it('test_sendCode_success_doesNotRollback', async () => {
    mockCheckRateLimit.mockResolvedValue(null);
    mockSendVerifyCode.mockResolvedValueOnce(undefined as never);

    const res = await POST(makeReq({ email: 'a@b.com', type: 'register', quizToken: 't' }));

    expect(res.status).toBe(200);
    expect(mockRollbackRateLimit).not.toHaveBeenCalled();
    expect(mockRevokeVerificationCode).not.toHaveBeenCalled();
    expect(mockRecordSecurityEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'send_code', result: 'success' }),
    );
  });
});
