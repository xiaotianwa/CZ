import { NextRequest } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { DEFAULT_GAME_CENTER_ENTRIES, GAME_CENTER_ICON_KEYS } from '@/data/gameCenterEntries';
import { isRemovedGameCenterEntryKey, mergeGameCenterEntries, type GameCenterEntryRecord } from '@/lib/game-center';

const createSchema = z.object({
  entryKey: z.string().trim().min(1, '请输入入口标识').max(50, '入口标识不能超过 50 个字符').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '入口标识仅支持小写字母、数字和中划线'),
  title: z.string().trim().min(1, '请输入入口名称').max(30, '入口名称不能超过 30 个字符'),
  href: z.string().trim().min(1, '请输入入口链接').max(120, '入口链接不能超过 120 个字符').startsWith('/', '入口链接需以 / 开头'),
  subtitle: z.string().trim().min(1, '请输入副标题').max(40, '副标题不能超过 40 个字符'),
  desc: z.string().trim().min(1, '请输入入口描述').max(120, '入口描述不能超过 120 个字符'),
  iconKey: z.enum(GAME_CENTER_ICON_KEYS),
  gradient: z.string().trim().min(1, '请输入渐变类名').max(120, '渐变类名不能超过 120 个字符'),
  glowColor: z.string().trim().min(1, '请输入光晕颜色').max(60, '光晕颜色不能超过 60 个字符'),
  badge: z.string().trim().max(10, '角标不能超过 10 个字符').optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isEnabled: z.boolean().optional(),
});

const updateSchema = z.object({
  entries: z.array(z.object({
    entryKey: z.string().min(1),
    isEnabled: z.boolean(),
    sortOrder: z.number().int().min(0).optional(),
  })).max(20),
});

function isMissingTableError(err: unknown) {
  return err instanceof Error && /GameCenterEntry/i.test(err.message) && /(no such table|no such column|does not exist)/i.test(err.message);
}

async function listEntries() {
  return prisma.$queryRaw<GameCenterEntryRecord[]>(Prisma.sql`
    SELECT
      "id",
      "entryKey",
      "title",
      "href",
      "subtitle",
      "desc",
      "iconKey",
      "gradient",
      "glowColor",
      "badge",
      "isEnabled",
      "sortOrder"
    FROM "GameCenterEntry"
    ORDER BY "sortOrder" ASC
  `);
}

async function ensureEntries() {
  const existing = await listEntries();

  const existingKeys = new Set(existing.map((item) => item.entryKey));
  const missing = DEFAULT_GAME_CENTER_ENTRIES.filter((item) => !existingKeys.has(item.entryKey));

  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((item) =>
        prisma.$executeRaw(Prisma.sql`
          INSERT INTO "GameCenterEntry" (
            "id", "entryKey", "title", "href", "subtitle", "desc", "iconKey", "gradient", "glowColor", "badge", "isEnabled", "sortOrder", "createdAt", "updatedAt"
          ) VALUES (
            ${`gce_${item.entryKey.replace(/[^a-z0-9]+/gi, '_')}`},
            ${item.entryKey},
            ${item.title},
            ${item.href},
            ${item.subtitle},
            ${item.desc},
            ${item.iconKey},
            ${item.gradient},
            ${item.glowColor},
            ${item.badge ?? null},
            ${true},
            ${item.sortOrder},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `)
      )
    );
  }

  return listEntries();
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    if (isRemovedGameCenterEntryKey(parsed.data.entryKey)) {
      return fail('该游戏入口已下线，不能重新添加');
    }

    const entries = await ensureEntries();
    if (entries.some((item) => item.entryKey === parsed.data.entryKey)) {
      return fail('该入口标识已存在');
    }

    const nextSortOrder = typeof parsed.data.sortOrder === 'number'
      ? parsed.data.sortOrder
      : (entries.length > 0 ? Math.max(...entries.map((item) => item.sortOrder)) + 1 : 0);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "GameCenterEntry" (
        "id", "entryKey", "title", "href", "subtitle", "desc", "iconKey", "gradient", "glowColor", "badge", "isEnabled", "sortOrder", "createdAt", "updatedAt"
      ) VALUES (
        ${`gce_${parsed.data.entryKey.replace(/[^a-z0-9]+/gi, '_')}`},
        ${parsed.data.entryKey},
        ${parsed.data.title},
        ${parsed.data.href},
        ${parsed.data.subtitle},
        ${parsed.data.desc},
        ${parsed.data.iconKey},
        ${parsed.data.gradient},
        ${parsed.data.glowColor},
        ${parsed.data.badge ? parsed.data.badge : null},
        ${parsed.data.isEnabled ?? true},
        ${nextSortOrder},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);

    const nextEntries = await listEntries();
    return ok(mergeGameCenterEntries(nextEntries), '新增成功');
  } catch (err) {
    if (isMissingTableError(err)) {
      return fail('请先执行数据库迁移后再新增游戏入口');
    }
    return handleError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const entries = await ensureEntries();
    return ok(mergeGameCenterEntries(entries));
  } catch (err) {
    if (isMissingTableError(err)) {
      return ok(mergeGameCenterEntries([]));
    }
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const entries = await ensureEntries();
    const existingKeys = new Set(entries.map((item) => item.entryKey));
    const invalid = parsed.data.entries.find((item) => !existingKeys.has(item.entryKey));
    if (invalid) return fail('存在无效的游戏入口');

    await prisma.$transaction(
      parsed.data.entries.map((item) =>
        prisma.$executeRaw(Prisma.sql`
          UPDATE "GameCenterEntry"
          SET
            "isEnabled" = ${item.isEnabled},
            "sortOrder" = ${typeof item.sortOrder === 'number' ? item.sortOrder : entries.find((entry) => entry.entryKey === item.entryKey)?.sortOrder ?? 0},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "entryKey" = ${item.entryKey}
        `)
      )
    );

    const nextEntries = await listEntries();

    return ok(mergeGameCenterEntries(nextEntries), '更新成功');
  } catch (err) {
    if (isMissingTableError(err)) {
      return fail('请先执行数据库迁移后再使用游戏入口开关');
    }
    return handleError(err);
  }
}
