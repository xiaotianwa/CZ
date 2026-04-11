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
    post: { findUnique: vi.fn() },
    comment: { create: vi.fn() },
  },
}));

vi.mock('@/lib/points', () => ({ grantPoints: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/notification', () => ({ notifyComment: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/banned-words', () => ({ checkBannedWords: vi.fn().mockResolvedValue(null) }));

import { POST } from '@/app/api/auth/comments/route';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkBannedWords } from '@/lib/banned-words';

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockPostFindUnique = vi.mocked(prisma.post.findUnique);
const mockCommentCreate = vi.mocked(prisma.comment.create);
const mockCheckBanned = vi.mocked(checkBannedWords);

const fakePayload = { id: 'user1', email: 'test@example.com', role: 'user', type: 'user' as const };
const fakePost = { id: 'post1', status: 'published', authorId: 'author1' };
const fakeComment = {
  id: 'c1', content: '好帖子', postId: 'post1', authorId: 'user1', createdAt: new Date(),
  author: { id: 'user1', name: '测试', avatar: null, role: 'user', level: 1, badge: null },
};

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/auth/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckBanned.mockResolvedValue(null);
});

describe('POST /api/auth/comments', () => {
  it('test_postComment_unauthenticated_returns401', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq({ postId: 'post1', content: '好' }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.message).toBe('未登录');
  });

  it('test_postComment_emptyContent_returns400', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    const res = await POST(makeReq({ postId: 'post1', content: '' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toContain('评论不能为空');
  });

  it('test_postComment_contentExceeds500Chars_returns400', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    const res = await POST(makeReq({ postId: 'post1', content: 'a'.repeat(501) }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toContain('最多500字');
  });

  it('test_postComment_postNotFound_returns404', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ postId: 'notexist', content: '好帖子' }));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.message).toContain('帖子不存在');
  });

  it('test_postComment_containsBannedWord_returns400', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockCheckBanned.mockResolvedValue('傻逼');
    const res = await POST(makeReq({ postId: 'post1', content: '你是傻逼' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.message).toContain('违禁词');
  });

  it('test_postComment_validRequest_createsComment', async () => {
    mockGetCurrentUser.mockResolvedValue(fakePayload);
    mockPostFindUnique.mockResolvedValue(fakePost as never);
    mockCommentCreate.mockResolvedValue(fakeComment as never);
    const res = await POST(makeReq({ postId: 'post1', content: '好帖子' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.content).toBe('好帖子');
    expect(mockCommentCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ postId: 'post1', authorId: 'user1' }),
    }));
  });
});
