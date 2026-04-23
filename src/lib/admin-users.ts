import { Prisma } from '@/generated/prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { revokeUserTokens } from '@/lib/token-blacklist';

export const managedUserRoles = ['fan', 'assistant', 'star', 'admin'] as const;

export type ManagedUserRole = (typeof managedUserRoles)[number];

export interface CreateManagedUserInput {
  email: string;
  password: string;
  name: string;
  role: ManagedUserRole;
  isActive?: boolean;
}

export async function createManagedUser(input: CreateManagedUserInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const [existingEmail, existingName] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findFirst({ where: { name }, select: { id: true } }),
  ]);

  if (existingEmail) {
    throw new Error('该邮箱已被注册');
  }

  if (existingName) {
    throw new Error('该昵称已被使用');
  }

  const password = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      email,
      password,
      name,
      role: input.role,
      isActive: input.isActive ?? true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      level: true,
      badge: true,
      customBadge: true,
      points: true,
      isActive: true,
      createdAt: true,
      _count: { select: { posts: true, comments: true } },
    },
  });
}

export async function deleteUserWithContent(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const summary = await prisma.$transaction(async (tx) => {
    // Prisma 交互式事务的同一 tx 客户端不支持并发调用（底层共享连接 + 游标），
    // 必须串行 await，否则 libSQL/SQLite 下可能出现 "Transaction already closed" 或数据不一致。
    const authoredPosts = await tx.post.findMany({ where: { authorId: userId }, select: { id: true } });
    const authoredComments = await tx.comment.findMany({ where: { authorId: userId }, select: { id: true } });
    const likedPosts = await tx.postLike.findMany({ where: { userId }, select: { postId: true } });

    const postIds = authoredPosts.map((item) => item.id);
    const commentIds = authoredComments.map((item) => item.id);
    const authoredPostIdSet = new Set(postIds);
    const likedPostIds = Array.from(
      new Set(likedPosts.map((item) => item.postId).filter((postId) => !authoredPostIdSet.has(postId))),
    );

    for (const postId of likedPostIds) {
      await tx.post.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
      });
    }

    const reportConditions: Prisma.ReportWhereInput[] = [
      { reporterId: userId },
      { targetType: 'user', targetId: userId },
      ...postIds.map((targetId) => ({ targetType: 'post', targetId })),
      ...commentIds.map((targetId) => ({ targetType: 'comment', targetId })),
    ];

    const deletedReports = await tx.report.deleteMany({ where: { OR: reportConditions } });
    const deletedNotifications = await tx.notification.deleteMany({ where: { fromId: userId } });
    const deletedFeedbacks = await tx.feedback.deleteMany({ where: { userId } });
    const deletedFanWorks = await tx.fanWork.deleteMany({ where: { userId } });
    const deletedBookmarks = await tx.bookmark.deleteMany({ where: { userId } });
    const deletedPostLikes = await tx.postLike.deleteMany({ where: { userId } });
    const deletedComments = await tx.comment.deleteMany({ where: { authorId: userId } });
    const deletedPosts = await tx.post.deleteMany({ where: { authorId: userId } });
    const deletedVerificationCodes = await tx.verificationCode.deleteMany({ where: { email: user.email } });

    await tx.user.delete({ where: { id: userId } });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      deletedPosts: deletedPosts.count,
      deletedComments: deletedComments.count,
      deletedPostLikes: deletedPostLikes.count,
      deletedBookmarks: deletedBookmarks.count,
      deletedFanWorks: deletedFanWorks.count,
      deletedFeedbacks: deletedFeedbacks.count,
      deletedReports: deletedReports.count,
      deletedNotifications: deletedNotifications.count,
      deletedVerificationCodes: deletedVerificationCodes.count,
    };
  });

  await revokeUserTokens(userId).catch(() => undefined);

  return summary;
}
