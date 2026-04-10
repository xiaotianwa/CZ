/**
 * Token 黑名单 — 内存缓存 + 数据库持久化
 * 黑名单按 userId 记录废弃时间戳，在此时间戳之前签发的 token 均视为无效
 * 内存缓存加速查询，数据库保证重启后不丢失
 */

import { prisma } from '@/lib/db';

// 内存热缓存（启动时从 DB 预加载）
const cache = new Map<string, number>();
let initialized = false;

/**
 * 从数据库预加载黑名单到内存（懒初始化，仅执行一次）
 */
async function ensureLoaded(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const configs = await prisma.siteConfig.findMany({
      where: { group: 'token_blacklist' },
    });
    for (const c of configs) {
      cache.set(c.key.replace('bl:', ''), Number(c.value));
    }
  } catch {
    // 数据库不可用时退化为纯内存模式
  }
}

/**
 * 将指定用户的所有现有 token 标记为无效
 * 在此时间点之前签发的 token 将被拒绝
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  const revokedAt = Math.floor(Date.now() / 1000);
  cache.set(userId, revokedAt);

  // 异步持久化到数据库（利用 SiteConfig 的 KV 存储）
  try {
    await prisma.siteConfig.upsert({
      where: { key: `bl:${userId}` },
      update: { value: String(revokedAt) },
      create: { key: `bl:${userId}`, value: String(revokedAt), group: 'token_blacklist' },
    });
  } catch {
    // 持久化失败不影响当前进程的内存黑名单
  }
}

/**
 * 检查 token 是否被废弃
 * @param userId 用户ID
 * @param tokenIssuedAt token 签发时间（JWT iat 字段，秒级时间戳）
 * @returns true 表示 token 已被废弃
 */
export async function isTokenRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
  await ensureLoaded();
  const revokedAt = cache.get(userId);
  if (!revokedAt) return false;
  return tokenIssuedAt <= revokedAt;
}
