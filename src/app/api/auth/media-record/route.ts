import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

const schema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  cosKey: z.string().min(1),
  size: z.number().positive(),
  mimeType: z.string().min(1),
  category: z.string().default('general'),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await getCurrentUser(req);
    if (!payload) {
      return fail('未登录', 401);
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message);
    }

    const media = await prisma.media.create({
      data: parsed.data,
    });

    return ok({
      id: media.id,
      url: media.url,
      filename: media.filename,
      size: media.size,
      mimeType: media.mimeType,
    });
  } catch (err) {
    return handleError(err);
  }
}
