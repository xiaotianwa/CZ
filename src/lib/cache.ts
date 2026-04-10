/**
 * 轻量级内存缓存
 * 适用于单实例部署（宝塔 PM2 场景）
 * 每个缓存条目带 TTL，过期自动失效
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * 获取缓存，未命中或过期返回 null
 */
export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * 设置缓存
 * @param ttlMs 过期时间（毫秒），默认 60 秒
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 60_000): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * 删除缓存（写入操作后主动失效）
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * 按前缀批量失效
 */
export function invalidateCacheByPrefix(prefix: string): void {
  Array.from(store.keys()).forEach((k) => {
    if (k.startsWith(prefix)) store.delete(k);
  });
}

// 定期清理过期条目（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([k, v]) => {
    if (now > v.expiresAt) store.delete(k);
  });
}, 5 * 60 * 1000).unref?.();
