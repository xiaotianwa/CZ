import { prisma } from '@/lib/db';

interface NotifyParams {
  userId: string;
  type: 'system';
  title: string;
  content: string;
  link?: string;
  fromId?: string;
  fromName?: string;
  fromAvatar?: string;
}

export async function createNotification(params: NotifyParams) {
  if (params.fromId && params.fromId === params.userId) return null;

  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      content: params.content,
      link: params.link,
      fromId: params.fromId,
      fromName: params.fromName,
      fromAvatar: params.fromAvatar,
    },
  });
}

export async function notifySystem(userId: string, title: string, content: string, link?: string) {
  return createNotification({
    userId,
    type: 'system',
    title,
    content,
    link,
  });
}
