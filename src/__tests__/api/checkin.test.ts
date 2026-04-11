import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  AuthError: class AuthError extends Error {
    status: number;
    constructor(msg: string, status: number) { super(msg); this.status = status; }
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    pointLog: { findFirst: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/points', () => ({
  grantDailyLogin: vi.fn(),
  grantPoints: vi.fn(),
}));

import { GET, POST } from '@/app/api/auth/checkin/route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { grantDailyLogin } from '@/lib/points';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockFindFirst = vi.mocked(prisma.pointLog.findFirst);
const mockFindMany = vi.mocked(prisma.pointLog.findMany);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockGrantDailyLogin = vi.mocked(grantDailyLogin);

const fakePayload = { id: 'user1', email: 'test@example.com', role: 'user', type: 'user' as const };

function makeReq() {
  return new NextRequest('http://localhost/api/auth/checkin');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/checkin', () => {
  it('test_getCheckin_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.message).toBe('未登录');
  });

  it('test_getCheckin_notCheckedInToday_returnsCheckedInFalse', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockFindFirst.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);
    mockUserFindUnique.mockResolvedValue({ points: 50, level: 1 } as never);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.checkedIn).toBe(false);
    expect(json.data.streak).toBe(0);
  });

  it('test_getCheckin_alreadyCheckedIn_returnsCheckedInTrue', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockFindFirst.mockResolvedValue({ id: 'log1', createdAt: new Date() } as never);
    mockFindMany.mockResolvedValue([{ createdAt: new Date() }] as never[]);
    mockUserFindUnique.mockResolvedValue({ points: 55, level: 1 } as never);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.checkedIn).toBe(true);
    expect(json.data.streak).toBe(1);
  });
});

describe('POST /api/auth/checkin', () => {
  it('test_postCheckin_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.message).toBe('未登录');
  });

  it('test_postCheckin_alreadyCheckedIn_returns400', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockGrantDailyLogin.mockResolvedValue(null);
    const res = await POST(makeReq());
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toBe('今天已经签到过了');
  });

  it('test_postCheckin_firstCheckin_returns200WithPoints', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockGrantDailyLogin.mockResolvedValue({ points: 5, totalPoints: 55, level: 1, levelUp: false });
    const res = await POST(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.points).toBe(5);
    expect(json.message).toBe('签到成功！获得 5 积分');
  });
});
