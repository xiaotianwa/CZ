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

  if (existingEmail) throw new Error('该邮箱已被注册');
  if (existingName) throw new Error('该昵称已被使用');

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
    },
  });
}

export async function deleteUserWithContent(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) throw new Error('用户不存在');

  const summary = await prisma.$transaction(async (tx) => {
    const deletedNotifications = await tx.notification.deleteMany({
      where: {
        OR: [
          { userId },
          { fromId: userId },
        ],
      },
    });
    const deletedFeedbacks = await tx.feedback.deleteMany({ where: { userId } });
    const deletedPointLogs = await tx.pointLog.deleteMany({ where: { userId } });
    const deletedVerificationCodes = await tx.verificationCode.deleteMany({ where: { email: user.email } });

    await tx.user.delete({ where: { id: userId } });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      deletedFeedbacks: deletedFeedbacks.count,
      deletedNotifications: deletedNotifications.count,
      deletedPointLogs: deletedPointLogs.count,
      deletedVerificationCodes: deletedVerificationCodes.count,
    };
  });

  await revokeUserTokens(userId).catch(() => undefined);

  return summary;
}
