import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getClientIp } from '@/lib/rate-limit';

const VERIFICATION_CODE_TTL_MS = 5 * 60 * 1000;
const QUIZ_PASS_TOKEN_TTL_MS = 10 * 60 * 1000;

type DbClient = Record<string, unknown>;
type VerificationScene = 'register' | 'reset';

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildVerificationCodeHash(email: string, scene: VerificationScene, code: string): string {
  return hashValue(`${normalizeEmail(email)}:${scene}:${code}`);
}

export function getRequestMeta(req: Request) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent')?.trim() || '';
  const uaHash = userAgent ? hashValue(userAgent) : null;
  return { ip, uaHash };
}

export async function recordSecurityEvent(
  db: DbClient,
  params: {
    eventType: string;
    result: 'success' | 'reject' | 'error';
    reason?: string;
    email?: string | null;
    userId?: string | null;
    ip?: string | null;
    uaHash?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    meta?: string | null;
  }
) {
  return (db as any).securityEvent.create({
    data: {
      eventType: params.eventType,
      result: params.result,
      reason: params.reason || null,
      email: params.email ? normalizeEmail(params.email) : null,
      userId: params.userId || null,
      ip: params.ip || null,
      uaHash: params.uaHash || null,
      targetType: params.targetType || null,
      targetId: params.targetId || null,
      meta: params.meta || null,
    },
  });
}

export async function createVerificationCode(
  db: DbClient,
  params: {
    email: string;
    scene: VerificationScene;
    code: string;
    ip?: string | null;
    uaHash?: string | null;
  }
) {
  const email = normalizeEmail(params.email);
  await (db as any).verificationCode.updateMany({
    where: {
      email,
      scene: params.scene,
      status: 'pending',
    },
    data: {
      status: 'revoked',
    },
  });

  return (db as any).verificationCode.create({
    data: {
      email,
      scene: params.scene,
      codeHash: buildVerificationCodeHash(email, params.scene, params.code),
      ip: params.ip || null,
      uaHash: params.uaHash || null,
      expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
    },
  });
}

export async function revokeVerificationCode(db: DbClient, id: string) {
  await (db as any).verificationCode.update({
    where: { id },
    data: { status: 'revoked' },
  }).catch(() => null);
}

export async function consumeVerificationCode(
  db: DbClient,
  params: {
    email: string;
    scene: VerificationScene;
    code: string;
  }
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const email = normalizeEmail(params.email);
  const record = await (db as any).verificationCode.findFirst({
    where: {
      email,
      scene: params.scene,
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      codeHash: true,
      expiresAt: true,
    },
  });

  if (!record) {
    return { ok: false, reason: '验证码错误或已过期' };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await (db as any).verificationCode.update({
      where: { id: record.id },
      data: { status: 'expired' },
    }).catch(() => null);
    return { ok: false, reason: '验证码错误或已过期' };
  }

  const expectedHash = buildVerificationCodeHash(email, params.scene, params.code);
  if (record.codeHash !== expectedHash) {
    return { ok: false, reason: '验证码错误或已过期' };
  }

  await (db as any).verificationCode.update({
    where: { id: record.id },
    data: {
      status: 'consumed',
      consumedAt: new Date(),
    },
  });

  return { ok: true, id: record.id };
}

export async function createQuizPassToken(
  db: DbClient,
  params: {
    email?: string | null;
    ip?: string | null;
    uaHash?: string | null;
    questionIds: string[];
    score: number;
  }
) {
  const token = randomBytes(24).toString('hex');
  const tokenHash = hashValue(token);
  await (db as any).quizPassToken.create({
    data: {
      tokenHash,
      email: params.email ? normalizeEmail(params.email) : null,
      ip: params.ip || null,
      uaHash: params.uaHash || null,
      questionSet: JSON.stringify(params.questionIds),
      score: params.score,
      expiresAt: new Date(Date.now() + QUIZ_PASS_TOKEN_TTL_MS),
    },
  });

  return { token, expiresIn: Math.floor(QUIZ_PASS_TOKEN_TTL_MS / 1000) };
}

export async function validateQuizPassToken(
  db: DbClient,
  params: {
    token: string;
    email?: string | null;
    ip?: string | null;
    uaHash?: string | null;
  }
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const tokenHash = hashValue(params.token);
  const record = await (db as any).quizPassToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      ip: true,
      uaHash: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!record || record.status !== 'active') {
    return { ok: false, reason: '答题验证已失效，请重新答题' };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    await (db as any).quizPassToken.update({
      where: { id: record.id },
      data: { status: 'expired' },
    }).catch(() => null);
    return { ok: false, reason: '答题验证已失效，请重新答题' };
  }

  if (record.email && params.email && record.email !== normalizeEmail(params.email)) {
    return { ok: false, reason: '答题验证与当前邮箱不匹配，请重新答题' };
  }

  if (record.ip && params.ip && record.ip !== params.ip) {
    return { ok: false, reason: '答题验证环境已变化，请重新答题' };
  }

  if (record.uaHash && params.uaHash && record.uaHash !== params.uaHash) {
    return { ok: false, reason: '答题验证环境已变化，请重新答题' };
  }

  if (!record.email && params.email) {
    await (db as any).quizPassToken.update({
      where: { id: record.id },
      data: { email: normalizeEmail(params.email) },
    }).catch(() => null);
  }

  return { ok: true, id: record.id };
}

export async function consumeQuizPassToken(
  db: DbClient,
  params: {
    token: string;
    email?: string | null;
    ip?: string | null;
    uaHash?: string | null;
  }
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const validation = await validateQuizPassToken(db, params);
  if (!validation.ok) {
    return validation;
  }

  await (db as any).quizPassToken.update({
    where: { id: validation.id },
    data: {
      status: 'consumed',
      consumedAt: new Date(),
      email: params.email ? normalizeEmail(params.email) : undefined,
    },
  });

  return { ok: true, id: validation.id };
}
