import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        content: true,
        images: true,
        author: { select: { name: true } },
      },
    });
    if (!post) return { title: '帖子不存在' };

    const title = `${post.author.name}的帖子`;
    const description = post.content.slice(0, 160).replace(/\n/g, ' ');
    const images: string[] = (() => { try { return JSON.parse(post.images || '[]'); } catch { return []; } })();
    const ogImage = images.find((u) => !u.match(/\.(mp4|webm|mov)$/i));

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return { title: '帖子详情' };
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
