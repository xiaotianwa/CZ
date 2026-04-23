import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  prisma: {
    adminAuditLog: { create: vi.fn() },
  },
}));

import { logAdminAction } from '@/lib/admin-audit';
import { prisma } from '@/lib/db';

const mockCreate = vi.mocked(prisma.adminAuditLog.create);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({} as never);
});

function fakeReq(headers: Record<string, string> = {}): NextRequest {
  return { headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } } as unknown as NextRequest;
}

describe('logAdminAction', () => {
  // ========== 基础写入 ==========
  it('test_logAdminAction_minimalParams_writesRecord', async () => {
    await logAdminAction({
      operator: { id: 'admin1', email: 'admin@x.com' },
      action: 'user.delete',
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operatorId: 'admin1',
        operatorEmail: 'admin@x.com',
        action: 'user.delete',
        targetType: null,
        targetId: null,
        before: null,
        after: null,
        note: null,
        ip: null,
        ua: null,
      }),
    });
  });

  it('test_logAdminAction_withTarget_writesTargetFields', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'post.delete',
      targetType: 'post',
      targetId: 'p123',
      note: '违规内容',
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operatorEmail: null,
        targetType: 'post',
        targetId: 'p123',
        note: '违规内容',
      }),
    });
  });

  // ========== before/after JSON 序列化 ==========
  it('test_logAdminAction_serializesBeforeAndAfter', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.role_change',
      before: { role: 'fan' },
      after: { role: 'assistant' },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: JSON.stringify({ role: 'fan' }),
        after: JSON.stringify({ role: 'assistant' }),
      }),
    });
  });

  it('test_logAdminAction_nullishBeforeAfter_storesNull', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'settings.update',
      before: null,
      after: null,
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        before: 'null', // 显式传 null 也会被序列化为字符串 "null"，与不传做区分
        after: 'null',
      }),
    });
  });

  // ========== IP/UA 抽取 ==========
  it('test_logAdminAction_extractsIpFromXRealIp', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.delete',
      req: fakeReq({ 'x-real-ip': '8.8.8.8', 'user-agent': 'UAT/1.0' }),
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: '8.8.8.8', ua: 'UAT/1.0' }),
    });
  });

  it('test_logAdminAction_fallsBackToXForwardedFor', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.delete',
      req: fakeReq({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }),
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: '1.1.1.1' }),
    });
  });

  it('test_logAdminAction_noReq_storesNullIpAndUa', async () => {
    await logAdminAction({ operator: { id: 'admin1' }, action: 'user.delete' });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: null, ua: null }),
    });
  });

  it('test_logAdminAction_emptyXffHeader_storesNull', async () => {
    await logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.delete',
      req: fakeReq({ 'x-forwarded-for': '  ' }),
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ip: null }),
    });
  });

  // ========== 异常吞咽（核心：审计失败不得阻塞业务） ==========
  it('test_logAdminAction_prismaThrows_swallowsError', async () => {
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreate.mockRejectedValueOnce(new Error('DB unavailable'));

    // 必须不抛
    await expect(logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.delete',
    })).resolves.toBeUndefined();

    expect(consoleErrSpy).toHaveBeenCalledWith(
      '[AdminAudit] 写审计日志失败:',
      expect.any(Error),
    );
    consoleErrSpy.mockRestore();
  });

  it('test_logAdminAction_returnsVoidEvenOnSuccess', async () => {
    await expect(logAdminAction({
      operator: { id: 'admin1' },
      action: 'user.delete',
    })).resolves.toBeUndefined();
  });
});
