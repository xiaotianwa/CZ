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
    post: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/points', () => ({ grantPoints: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/notification', () => ({ notifyLike: vi.fn().mockResolvedValue(undefined) }));

import { POST, DELETE } from '@/app/api/auth/posts/[postId]/like/route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockPostFindUnique = vi.mocked(prisma.post.findUnique);
const mockPostUpdate = vi.mocked(prisma.post.update);

const fakePayload = { id: 'user1', email: 'test@example.com', role: 'user', type: 'user' as const };
const fakePost = { id: 'post1', likes: 10, authorId: 'author1' };

function makeReq() {
  return new NextRequest('http://localhost/api/auth/posts/post1/like');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/posts/[postId]/like', () => {
  it('test_postLike_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.message).toBe('未登录');
  });

  it('test_postLike_postNotFound_returns404', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: { postId: 'notexist' } });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.message).toBe('帖子不存在');
  });

  it('test_postLike_validPost_incrementsLikes', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    mockPostUpdate.mockResolvedValue({ ...fakePost, likes: 11 } as never);
    const res = await POST(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.likes).toBe(11);
    expect(mockPostUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { likes: 11 },
    }));
  });
});

describe('DELETE /api/auth/posts/[postId]/like', () => {
  it('test_deleteLike_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(res.status).toBe(401);
  });

  it('test_deleteLike_validPost_decrementsLikesNotBelowZero', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    const postWithOneLike = { ...fakePost, likes: 1 };
    mockPostFindUnique.mockResolvedValue(postWithOneLike as never);
    mockPostUpdate.mockResolvedValue({ ...postWithOneLike, likes: 0 } as never);
    const res = await DELETE(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.likes).toBe(0);
    expect(mockPostUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { likes: 0 },
    }));
  });
});
