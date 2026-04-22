import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, '..', 'prisma', 'dev.db')}`;
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function deleteUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return prisma.$transaction(async (tx) => {
    const [authoredPosts, authoredComments, likedPosts] = await Promise.all([
      tx.post.findMany({ where: { authorId: userId }, select: { id: true } }),
      tx.comment.findMany({ where: { authorId: userId }, select: { id: true } }),
      tx.postLike.findMany({ where: { userId }, select: { postId: true } }),
    ]);

    const postIds = authoredPosts.map((item) => item.id);
    const commentIds = authoredComments.map((item) => item.id);
    const authoredPostIdSet = new Set(postIds);
    const likedPostIds = Array.from(
      new Set(likedPosts.map((item) => item.postId).filter((postId) => !authoredPostIdSet.has(postId))),
    );

    await Promise.all(
      likedPostIds.map((postId) =>
        tx.post.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } },
        }),
      ),
    );

    const reportConditions: Prisma.ReportWhereInput[] = [
      { reporterId: userId },
      { targetType: 'user', targetId: userId },
      ...postIds.map((targetId) => ({ targetType: 'post', targetId })),
      ...commentIds.map((targetId) => ({ targetType: 'comment', targetId })),
    ];

    const [deletedReports, deletedNotifications, deletedFeedbacks, deletedFanWorks, deletedBookmarks, deletedPostLikes, deletedComments, deletedPosts, deletedVerificationCodes] = await Promise.all([
      tx.report.deleteMany({ where: { OR: reportConditions } }),
      tx.notification.deleteMany({ where: { fromId: userId } }),
      tx.feedback.deleteMany({ where: { userId } }),
      tx.fanWork.deleteMany({ where: { userId } }),
      tx.bookmark.deleteMany({ where: { userId } }),
      tx.postLike.deleteMany({ where: { userId } }),
      tx.comment.deleteMany({ where: { authorId: userId } }),
      tx.post.deleteMany({ where: { authorId: userId } }),
      tx.verificationCode.deleteMany({ where: { email: user.email } }),
    ]);

    await tx.user.delete({ where: { id: userId } });

    return {
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
}

async function main() {
  const emails = process.argv.slice(2).map((item) => item.trim().toLowerCase()).filter(Boolean);

  if (emails.length === 0) {
    console.error('请至少传入一个邮箱，例如：npx tsx scripts/delete-users.ts fan2@test.com');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
    orderBy: { createdAt: 'asc' },
  });

  const foundEmails = new Set(users.map((item) => item.email.toLowerCase()));
  const missingEmails = emails.filter((email) => !foundEmails.has(email));

  if (missingEmails.length > 0) {
    console.log(`未找到以下账号：${missingEmails.join(', ')}`);
  }

  if (users.length === 0) {
    console.log('没有可删除的账号。');
    return;
  }

  for (const user of users) {
    const summary = await deleteUserById(user.id);
    console.log(`已删除 ${summary.email}（${summary.name}），帖子 ${summary.deletedPosts}，评论 ${summary.deletedComments}，二创 ${summary.deletedFanWorks}`);
  }

  console.log(`完成，共删除 ${users.length} 个账号。`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('删除用户脚本执行失败：', error);
    await prisma.$disconnect();
    process.exit(1);
  });
