/**
 * 基于内存的 IP 级别频率限制
 * 适用于单实例部署；多实例需改用 Redis
 */

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

/**
 * 检查是否超过频率限制
 * @param key 限流键（通常是 IP 地址）
 * @returns null 表示允许；否则返回剩余等待秒数
 */
export function checkRateLimit(key: string, options: RateLimitOptions): number | null {
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

/**
 * 回退一次限流计数（用于操作失败时不消耗配额）
 */
export function rollbackRateLimit(key: string, namespace: string): void {
  const store = getStore(namespace);
  const record = store.get(key);
  if (record && record.count > 0) {
    record.count--;
  }
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
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
