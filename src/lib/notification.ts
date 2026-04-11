import { prisma } from '@/lib/db';

interface NotifyParams {
  userId: string;
  type: 'comment' | 'like' | 'pin' | 'system';
  title: string;
  content: string;
  link?: string;
  fromId?: string;
  fromName?: string;
  fromAvatar?: string;
}

export async function createNotification(params: NotifyParams) {
  // 不给自己发通知
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

export async function notifyComment(
  postAuthorId: string,
  commenter: { id: string; name: string; avatar?: string | null },
  postId: string,
  commentContent: string,
) {
  return createNotification({
    userId: postAuthorId,
    type: 'comment',
    title: '你的帖子收到了新评论',
    content: `${commenter.name}: ${commentContent.slice(0, 80)}`,
    link: `/community/${postId}`,
    fromId: commenter.id,
    fromName: commenter.name,
    fromAvatar: commenter.avatar || undefined,
  });
}

export async function notifyLike(
  postAuthorId: string,
  liker: { id: string; name: string; avatar?: string | null },
  postId: string,
) {
  return createNotification({
    userId: postAuthorId,
    type: 'like',
    title: '你的帖子被点赞了',
    content: `${liker.name} 赞了你的帖子`,
    link: `/community/${postId}`,
    fromId: liker.id,
    fromName: liker.name,
    fromAvatar: liker.avatar || undefined,
  });
}

export async function notifyPin(postAuthorId: string, postId: string) {
  return createNotification({
    userId: postAuthorId,
    type: 'pin',
    title: '你的帖子被置顶了',
    content: '管理员将你的帖子设为置顶',
    link: `/community/${postId}`,
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
