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
    user: { findUnique: vi.fn() },
  },
}));

import { GET } from '@/app/api/auth/me/route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

const fakePayload = { id: 'user1', email: 'test@example.com', role: 'user', type: 'user' as const };
const fakeUser = { id: 'user1', email: 'test@example.com', name: '测试用户', avatar: null, role: 'user', level: 1, badge: null, points: 100, bio: '', city: '', createdAt: new Date() };

function makeReq() {
  return new NextRequest('http://localhost/api/auth/me');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/me', () => {
  it('test_getMe_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.code).toBe(401);
    expect(json.message).toBe('未登录');
  });

  it('test_getMe_userNotFoundInDb_returns404', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.message).toBe('用户不存在');
  });

  it('test_getMe_authenticated_returnsUserData', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockFindUnique.mockResolvedValue(fakeUser as never);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.id).toBe('user1');
    expect(json.data.email).toBe('test@example.com');
  });
});
