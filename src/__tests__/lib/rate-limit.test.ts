import { describe, it, expect, beforeEach, vi } from 'vitest';

type RedisStub = {
  incr: ReturnType<typeof vi.fn>;
  decr: ReturnType<typeof vi.fn>;
  pExpire: ReturnType<typeof vi.fn>;
  pTTL: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

const redisState: { client: RedisStub | null } = { client: null };

vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(async () => redisState.client),
  isRedisConfigured: vi.fn(() => redisState.client !== null),
}));

import { checkRateLimit, rollbackRateLimit, getClientIp } from '@/lib/rate-limit';

function uniqNs(tag: string): string {
  return `${tag}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeRedisStub(overrides: Partial<RedisStub> = {}): RedisStub {
  // 简化的 Redis 计数 & TTL 模拟
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  const stub: RedisStub = {
    incr: vi.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    decr: vi.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) - 1;
      counts.set(key, next);
      return next;
    }),
    pExpire: vi.fn(async (key: string, ms: number) => {
      ttls.set(key, ms);
      return 1;
    }),
    pTTL: vi.fn(async (key: string) => {
      return ttls.get(key) ?? -2;
    }),
    del: vi.fn(async (key: string) => {
      counts.delete(key);
      ttls.delete(key);
      return 1;
    }),
    ...overrides,
  };
  return stub;
}

beforeEach(() => {
  redisState.client = null;
  vi.clearAllMocks();
});

describe('rate-limit 内存路径', () => {
  it('test_checkRateLimit_memory_underLimit_returnsNull', async () => {
    const ns = uniqNs('mem');
    const r1 = await checkRateLimit('1.1.1.1', { namespace: ns, windowMs: 60_000, max: 3 });
    const r2 = await checkRateLimit('1.1.1.1', { namespace: ns, windowMs: 60_000, max: 3 });
    expect(r1).toBeNull();
    expect(r2).toBeNull();
  });

  it('test_checkRateLimit_memory_overLimit_returnsRemainingSeconds', async () => {
    const ns = uniqNs('mem');
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('2.2.2.2', { namespace: ns, windowMs: 60_000, max: 3 });
    }
    const blocked = await checkRateLimit('2.2.2.2', { namespace: ns, windowMs: 60_000, max: 3 });
    expect(blocked).not.toBeNull();
    expect(blocked!).toBeGreaterThan(0);
    expect(blocked!).toBeLessThanOrEqual(60);
  });

  it('test_checkRateLimit_memory_windowExpired_allowsAgain', async () => {
    const ns = uniqNs('mem');
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      for (let i = 0; i < 3; i++) {
        await checkRateLimit('3.3.3.3', { namespace: ns, windowMs: 1_000, max: 3 });
      }
      const blocked = await checkRateLimit('3.3.3.3', { namespace: ns, windowMs: 1_000, max: 3 });
      expect(blocked).not.toBeNull();

      vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));
      const allowed = await checkRateLimit('3.3.3.3', { namespace: ns, windowMs: 1_000, max: 3 });
      expect(allowed).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('test_rollbackRateLimit_memory_restoresQuota', async () => {
    const ns = uniqNs('mem');
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('4.4.4.4', { namespace: ns, windowMs: 60_000, max: 3 });
    }
    // 超限
    expect(await checkRateLimit('4.4.4.4', { namespace: ns, windowMs: 60_000, max: 3 })).not.toBeNull();
    // 回滚后可以再消费 1 次
    await rollbackRateLimit('4.4.4.4', ns);
    expect(await checkRateLimit('4.4.4.4', { namespace: ns, windowMs: 60_000, max: 3 })).toBeNull();
  });
});

describe('rate-limit Redis 路径', () => {
  it('test_checkRateLimit_redis_firstCall_setsTTL', async () => {
    redisState.client = makeRedisStub();
    const ns = uniqNs('redis');
    const r = await checkRateLimit('5.5.5.5', { namespace: ns, windowMs: 60_000, max: 3 });
    expect(r).toBeNull();
    expect(redisState.client.incr).toHaveBeenCalledTimes(1);
    expect(redisState.client.pExpire).toHaveBeenCalledWith(expect.stringContaining(ns), 60_000);
  });

  it('test_checkRateLimit_redis_overLimit_returnsRemainingSeconds', async () => {
    redisState.client = makeRedisStub();
    const ns = uniqNs('redis');
    for (let i = 0; i < 3; i++) {
      await checkRateLimit('6.6.6.6', { namespace: ns, windowMs: 60_000, max: 3 });
    }
    const blocked = await checkRateLimit('6.6.6.6', { namespace: ns, windowMs: 60_000, max: 3 });
    expect(blocked).not.toBeNull();
    expect(blocked!).toBeGreaterThan(0);
  });

  it('test_checkRateLimit_redis_clientUnavailable_fallsBackToMemory', async () => {
    redisState.client = null;
    const ns = uniqNs('fallback');
    const r1 = await checkRateLimit('7.7.7.7', { namespace: ns, windowMs: 60_000, max: 1 });
    const r2 = await checkRateLimit('7.7.7.7', { namespace: ns, windowMs: 60_000, max: 1 });
    expect(r1).toBeNull();
    expect(r2).not.toBeNull();
  });

  it('test_checkRateLimit_redis_incrThrows_fallsBackToMemory', async () => {
    redisState.client = makeRedisStub({
      incr: vi.fn(async () => {
        throw new Error('redis down');
      }),
    });
    const ns = uniqNs('redis-throw');
    const r1 = await checkRateLimit('8.8.8.8', { namespace: ns, windowMs: 60_000, max: 1 });
    const r2 = await checkRateLimit('8.8.8.8', { namespace: ns, windowMs: 60_000, max: 1 });
    expect(r1).toBeNull();
    expect(r2).not.toBeNull();
  });

  it('test_checkRateLimit_redis_ttlMissing_reissuesExpire', async () => {
    const stub = makeRedisStub();
    stub.pTTL = vi.fn(async () => -1);
    redisState.client = stub;
    const ns = uniqNs('redis-ttl');
    const r = await checkRateLimit('9.9.9.9', { namespace: ns, windowMs: 60_000, max: 3 });
    expect(r).toBeNull();
    // 首次 incr=1 时会调用一次，这里 pTTL=-1 应再调用一次 pExpire
    expect(stub.pExpire).toHaveBeenCalledTimes(2);
  });

  it('test_rollbackRateLimit_redis_decrToZero_deletesKey', async () => {
    redisState.client = makeRedisStub();
    const ns = uniqNs('redis-rb');
    await checkRateLimit('10.10.10.10', { namespace: ns, windowMs: 60_000, max: 3 });
    await rollbackRateLimit('10.10.10.10', ns);
    expect(redisState.client.decr).toHaveBeenCalledTimes(1);
    expect(redisState.client.del).toHaveBeenCalledTimes(1);
  });

  it('test_rollbackRateLimit_redis_throws_fallsBackToMemory', async () => {
    redisState.client = makeRedisStub({
      decr: vi.fn(async () => {
        throw new Error('redis down');
      }),
    });
    const ns = uniqNs('redis-rb-throw');
    // 不应抛出
    await expect(rollbackRateLimit('11.11.11.11', ns)).resolves.toBeUndefined();
  });
});

describe('getClientIp', () => {
  it('test_getClientIp_prefersXRealIp', () => {
    const req = new Request('http://test', {
      headers: { 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('test_getClientIp_fallsBackToXffFirstEntry', () => {
    const req = new Request('http://test', {
      headers: { 'x-forwarded-for': '9.9.9.9, 10.10.10.10' },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('test_getClientIp_noHeaders_returnsLoopback', () => {
    const req = new Request('http://test');
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
