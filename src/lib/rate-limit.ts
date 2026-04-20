/**
 * 基于内存的 IP 级别频率限制
 * 适用于单实例部署；多实例需改用 Redis
 */

import { getRedisClient } from '@/lib/redis';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitRecord>>();

function getStore(namespace: string): Map<string, RateLimitRecord> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

export interface RateLimitOptions {
  /** 命名空间，不同接口隔离 */
  namespace: string;
  /** 时间窗口（毫秒） */
  windowMs: number;
  /** 窗口内最大请求数 */
  max: number;
}

const RATE_LIMIT_PREFIX = process.env.REDIS_RATE_LIMIT_PREFIX?.trim() || 'rate-limit';

function buildRedisKey(key: string, namespace: string): string {
  return `${RATE_LIMIT_PREFIX}:${namespace}:${key}`;
}

async function checkRateLimitByMemory(key: string, options: RateLimitOptions): Promise<number | null> {
  const store = getStore(options.namespace);
  const now = Date.now();

  const record = store.get(key);
  if (record && now < record.resetAt) {
    if (record.count >= options.max) {
      return Math.ceil((record.resetAt - now) / 1000);
    }
    record.count++;
    return null;
  }

  store.set(key, { count: 1, resetAt: now + options.windowMs });
  return null;
}

async function rollbackRateLimitByMemory(key: string, namespace: string): Promise<void> {
  const store = getStore(namespace);
  const record = store.get(key);
  if (record && record.count > 0) {
    record.count--;
    if (record.count === 0) {
      store.delete(key);
    }
  }
}

async function checkRateLimitByRedis(key: string, options: RateLimitOptions): Promise<number | null> {
  const client = await getRedisClient();
  if (!client) {
    return checkRateLimitByMemory(key, options);
  }

  const redisKey = buildRedisKey(key, options.namespace);
  try {
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pExpire(redisKey, options.windowMs);
    }

    let ttlMs = await client.pTTL(redisKey);
    if (ttlMs < 0) {
      await client.pExpire(redisKey, options.windowMs);
      ttlMs = options.windowMs;
    }

    if (count > options.max) {
      return Math.ceil(ttlMs / 1000);
    }

    return null;
  } catch (err) {
    console.error('[RateLimit] Redis 限流失败，回退到内存:', err);
    return checkRateLimitByMemory(key, options);
  }
}

async function rollbackRateLimitByRedis(key: string, namespace: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    await rollbackRateLimitByMemory(key, namespace);
    return;
  }

  const redisKey = buildRedisKey(key, namespace);
  try {
    const count = await client.decr(redisKey);
    if (count <= 0) {
      await client.del(redisKey);
    }
  } catch (err) {
    console.error('[RateLimit] Redis 回滚失败，回退到内存:', err);
    await rollbackRateLimitByMemory(key, namespace);
  }
}

/**
 * 检查是否超过频率限制
 * @param key 限流键（通常是 IP 地址）
 * @returns null 表示允许；否则返回剩余等待秒数
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<number | null> {
  return checkRateLimitByRedis(key, options);
}

/**
 * 回退一次限流计数（用于操作失败时不消耗配额）
 */
export async function rollbackRateLimit(key: string, namespace: string): Promise<void> {
  await rollbackRateLimitByRedis(key, namespace);
}

/**
 * 定期清理过期记录，防止内存泄漏
 * 每 3 分钟执行一次
 */
const CLEANUP_INTERVAL = 3 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    Array.from(stores.entries()).forEach(([ns, store]) => {
      Array.from(store.entries()).forEach(([key, record]) => {
        if (now >= record.resetAt) {
          store.delete(key);
        }
      });
      if (store.size === 0) stores.delete(ns);
    });
  }, CLEANUP_INTERVAL);
  // 允许进程正常退出，不被此定时器阻塞
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// 模块加载时自动启动清理
ensureCleanup();

/**
 * 从请求中获取客户端 IP
 * 注意：生产环境必须配置反向代理（Nginx/CloudFlare）设置可信的 X-Forwarded-For
 * 未经反向代理的请求中，X-Forwarded-For 可被客户端伪造
 */
export function getClientIp(req: Request): string {
  // 优先使用反向代理设置的 X-Real-IP（不可伪造）
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // 其次使用 X-Forwarded-For 的第一个 IP
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return '127.0.0.1';
}
