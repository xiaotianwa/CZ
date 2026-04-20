import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL?.trim() || '';
const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000);

type GlobalRedisState = {
  redisClient?: ReturnType<typeof createClient>;
  redisConnectPromise?: Promise<ReturnType<typeof createClient> | null>;
};

const globalForRedis = globalThis as typeof globalThis & GlobalRedisState;

function createRedisClient(): ReturnType<typeof createClient> {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });
  client.on('error', (err: unknown) => {
    console.error('[Redis] 连接异常:', err);
  });
  return client;
}

export function isRedisConfigured(): boolean {
  return REDIS_URL.length > 0;
}

export async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  const existing = globalForRedis.redisClient;
  if (existing?.isOpen) {
    return existing;
  }

  if (globalForRedis.redisConnectPromise) {
    return globalForRedis.redisConnectPromise;
  }

  globalForRedis.redisConnectPromise = (async () => {
    const client = existing ?? createRedisClient();

    try {
      if (!client.isOpen) {
        await client.connect();
      }
      globalForRedis.redisClient = client;
      return client;
    } catch (err) {
      console.error('[Redis] 连接失败，回退到内存限流:', err);
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } catch {}
      globalForRedis.redisClient = undefined;
      return null;
    } finally {
      globalForRedis.redisConnectPromise = undefined;
    }
  })();

  return globalForRedis.redisConnectPromise;
}
