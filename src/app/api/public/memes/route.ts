import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const memeSelect = {
  id: true,
  title: true,
  origin: true,
  description: true,
  example: true,
  image: true,
  tags: true,
  popularity: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  try {
    const memes = await prisma.meme.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { popularity: 'desc' }],
      select: memeSelect,
    });
    return ok(memes.map((meme) => ({ ...meme, video: null })));
  } catch (err) {
    return handleError(err);
  }
}
