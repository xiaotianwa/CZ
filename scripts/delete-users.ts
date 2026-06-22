import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client.js';
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

  if (!user) throw new Error('用户不存在');

  return prisma.$transaction(async (tx) => {
    const [deletedNotifications, deletedFeedbacks, deletedPointLogs, deletedVerificationCodes] = await Promise.all([
      tx.notification.deleteMany({ where: { OR: [{ userId }, { fromId: userId }] } }),
      tx.feedback.deleteMany({ where: { userId } }),
      tx.pointLog.deleteMany({ where: { userId } }),
      tx.verificationCode.deleteMany({ where: { email: user.email } }),
    ]);

    await tx.user.delete({ where: { id: userId } });

    return {
      email: user.email,
      name: user.name,
      deletedFeedbacks: deletedFeedbacks.count,
      deletedNotifications: deletedNotifications.count,
      deletedPointLogs: deletedPointLogs.count,
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

  for (const user of users) {
    const summary = await deleteUserById(user.id);
    console.log(`已删除 ${summary.email}（${summary.name}），反馈 ${summary.deletedFeedbacks}，通知 ${summary.deletedNotifications}`);
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
