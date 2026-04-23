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
    postLike: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    pointLog: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    // 将 $transaction 模拟为并行执行数组中的 Promise，等价于真实行为
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock('@/lib/points', () => ({ grantPoints: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/notification', () => ({ notifyLike: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/hot-score', () => ({ updatePostHotScore: vi.fn().mockResolvedValue(undefined) }));

import { POST, DELETE } from '@/app/api/auth/posts/[postId]/like/route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { grantPoints } from '@/lib/points';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockPostFindUnique = vi.mocked(prisma.post.findUnique);
const mockPostUpdate = vi.mocked(prisma.post.update);
const mockPostLikeCreate = vi.mocked(prisma.postLike.create);
const mockPostLikeDelete = vi.mocked(prisma.postLike.delete);
const mockPostLikeFindUnique = vi.mocked(prisma.postLike.findUnique);
const mockPointLogFindFirst = vi.mocked(prisma.pointLog.findFirst);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockGrantPoints = vi.mocked(grantPoints);

const fakePayload = { id: 'user1', email: 'test@example.com', role: 'user', type: 'user' as const };
const fakePost = { id: 'post1', likes: 10, authorId: 'author1' };

function makeReq() {
  return new NextRequest('http://localhost/api/auth/posts/post1/like');
}

beforeEach(() => {
  vi.clearAllMocks();
  // 默认：未奖励过 + postLike 创建/删除成功 + user 查询返回基础信息（供通知使用）
  mockPointLogFindFirst.mockResolvedValue(null);
  mockPostLikeCreate.mockResolvedValue({ id: 'pl1', userId: 'user1', postId: 'post1' } as never);
  mockPostLikeDelete.mockResolvedValue({ id: 'pl1' } as never);
  mockUserFindUnique.mockResolvedValue({ name: '测试用户', avatar: null } as never);
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
      data: { likes: { increment: 1 } },
    }));
  });

  it('test_postLike_duplicateLike_returns409LikeError', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    // 模拟 Prisma P2002 unique constraint violation
    const err = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPostLikeCreate.mockRejectedValueOnce(err);
    const res = await POST(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    // fail() 返回 400 默认状态码
    expect(json.message).toContain('你已经点过赞');
  });

  // ========== M4 幂等回归 ==========
  it('test_postLike_firstTimeAuthorDifferent_grantsBeLikedPoints', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    mockPostUpdate.mockResolvedValue({ ...fakePost, likes: 11 } as never);
    mockPointLogFindFirst.mockResolvedValue(null); // 首次奖励
    const res = await POST(makeReq(), { params: { postId: 'post1' } });
    expect(res.status).toBe(200);
    // 异步奖励不阻塞响应，等微Task 刷新一下
    await new Promise((r) => setTimeout(r, 10));
    expect(mockPointLogFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'author1',
        action: 'be_liked',
        detail: '帖子被点赞|post:post1|from:user1',
      }),
    }));
    expect(mockGrantPoints).toHaveBeenCalledWith('author1', 'be_liked', '帖子被点赞|post:post1|from:user1');
  });

  it('test_postLike_alreadyRewarded_skipsGrantPoints', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    mockPostUpdate.mockResolvedValue({ ...fakePost, likes: 11 } as never);
    // 已有奖励记录 → 幂等跳过
    mockPointLogFindFirst.mockResolvedValue({ id: 'pl-existing' } as never);
    const res = await POST(makeReq(), { params: { postId: 'post1' } });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 10));
    expect(mockPointLogFindFirst).toHaveBeenCalled();
    expect(mockGrantPoints).not.toHaveBeenCalled();
  });

  it('test_postLike_selfLike_neverGrantsOrChecksPoints', async () => {
    // 自己给自己点赞不触发幂等查询也不奖励
    mockGetCurrentUser.mockResolvedValue({ ...fakePayload, id: 'author1' });
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    mockPostUpdate.mockResolvedValue({ ...fakePost, likes: 11 } as never);
    await POST(makeReq(), { params: { postId: 'post1' } });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockPointLogFindFirst).not.toHaveBeenCalled();
    expect(mockGrantPoints).not.toHaveBeenCalled();
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
    mockPostLikeFindUnique.mockResolvedValue({ id: 'pl1', userId: 'user1', postId: 'post1' } as never);
    const postWithOneLike = { ...fakePost, likes: 1 };
    mockPostUpdate.mockResolvedValue({ ...postWithOneLike, likes: 0 } as never);
    const res = await DELETE(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.likes).toBe(0);
    expect(mockPostUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { likes: { decrement: 1 } },
    }));
  });

  it('test_deleteLike_neverLiked_returnsError', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostLikeFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: { postId: 'post1' } });
    const json = await res.json();
    expect(json.message).toContain('还没有点过赞');
  });
});
