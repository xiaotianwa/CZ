import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
  AuthError: class AuthError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    admin: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/points', () => ({
  grantAdminPointsToUsers: vi.fn(),
}));

import { POST } from '@/app/api/admin/users/points/route';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { grantAdminPointsToUsers } from '@/lib/points';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockAdminFindUnique = vi.mocked(prisma.admin.findUnique);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockGrantAdminPointsToUsers = vi.mocked(grantAdminPointsToUsers);

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/users/points', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com', role: 'super_admin', type: 'admin' });
  mockAdminFindUnique.mockResolvedValue({ id: 'admin-1', name: '超级管理员', avatar: '/admin.png', isActive: true } as never);
});

describe('POST /api/admin/users/points', () => {
  it('test_singleGrant_success_returns200', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' } as never);
    mockGrantAdminPointsToUsers.mockResolvedValue([
      { id: 'user-1', name: '测试用户', totalPoints: 150, level: 2, levelUp: true },
    ]);

    const res = await POST(makeReq({
      mode: 'single',
      userId: 'user-1',
      points: 50,
      reason: '活动奖励',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.count).toBe(1);
    expect(mockGrantAdminPointsToUsers).toHaveBeenCalledWith({
      userIds: ['user-1'],
      points: 50,
      reason: '活动奖励',
      actor: { id: 'admin-1', name: '超级管理员', avatar: '/admin.png', isActive: true },
    });
  });

  it('test_batchGrant_byFilters_success_returns200', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }] as never);
    mockGrantAdminPointsToUsers.mockResolvedValue([
      { id: 'user-1', name: '用户1', totalPoints: 200, level: 3, levelUp: false },
      { id: 'user-2', name: '用户2', totalPoints: 300, level: 4, levelUp: true },
    ]);

    const res = await POST(makeReq({
      mode: 'batch',
      points: 100,
      reason: '批量活动奖励',
      filters: {
        keyword: '测试',
        role: 'fan',
        status: 'active',
      },
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.count).toBe(2);
    expect(json.data.totalGranted).toBe(200);
    expect(mockUserFindMany).toHaveBeenCalled();
    expect(mockGrantAdminPointsToUsers).toHaveBeenCalledWith({
      userIds: ['user-1', 'user-2'],
      points: 100,
      reason: '批量活动奖励',
      actor: { id: 'admin-1', name: '超级管理员', avatar: '/admin.png', isActive: true },
    });
  });

  it('test_batchGrant_noUsers_returns404', async () => {
    mockUserFindMany.mockResolvedValue([] as never);

    const res = await POST(makeReq({
      mode: 'batch',
      points: 20,
      reason: '补偿发放',
      filters: {
        keyword: '',
        role: '',
        status: '',
      },
    }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.message).toBe('没有匹配到可加分的用户');
    expect(mockGrantAdminPointsToUsers).not.toHaveBeenCalled();
  });
});
