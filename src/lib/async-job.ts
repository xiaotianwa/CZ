/**
 * 异步任务队列模块
 * 提供任务入队（enqueueJob）和 worker 执行（processJobs）
 */

import { prisma } from '@/lib/db';

// ==================== 任务类型定义 ====================

export type JobType = 'grant_points' | 'notify_comment' | 'update_hot_score' | 'video_moderation';

export interface EnqueueOptions {
  type: JobType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  scheduledAt?: Date;
  maxAttempts?: number;
}

// ==================== 入队 ====================

/**
 * 将异步任务入队，供 worker 稍后执行
 * 如果提供了 idempotencyKey 且已存在，则跳过（幂等）
 */
export async function enqueueJob(options: EnqueueOptions): Promise<string | null> {
  const { type, payload, idempotencyKey, scheduledAt, maxAttempts } = options;

  if (idempotencyKey) {
    const existing = await prisma.asyncJob.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      return null; // 幂等：已存在则跳过
    }
  }

  const job = await prisma.asyncJob.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      idempotencyKey: idempotencyKey || null,
      scheduledAt: scheduledAt || new Date(),
      maxAttempts: maxAttempts ?? 3,
    },
  });

  return job.id;
}

// ==================== 任务处理器注册表 ====================

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: JobType, handler: JobHandler) {
  handlers.set(type, handler);
}

// ==================== Worker ====================

/**
 * 拉取并执行待处理的任务（单次批量）
 * @param batchSize 一次最多处理多少个任务
 * @returns 处理的任务数
 */
export async function processJobs(batchSize: number = 10): Promise<number> {
  const now = new Date();

  const jobs = await prisma.asyncJob.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: batchSize,
  });

  let processed = 0;

  for (const job of jobs) {
    if (job.attempts >= job.maxAttempts) {
      await prisma.asyncJob.update({
        where: { id: job.id },
        data: { status: 'dead', finishedAt: now },
      });
      continue;
    }

    const handler = handlers.get(job.type);
    if (!handler) {
      await prisma.asyncJob.update({
        where: { id: job.id },
        data: {
          status: 'dead',
          lastError: `No handler registered for type: ${job.type}`,
          finishedAt: now,
        },
      });
      continue;
    }

    // 乐观锁：只处理还在 pending/failed 状态的
    const claimed = await prisma.asyncJob.updateMany({
      where: { id: job.id, status: { in: ['pending', 'failed'] } },
      data: { status: 'running', startedAt: now, attempts: job.attempts + 1 },
    });

    if (claimed.count === 0) continue; // 被其他 worker 抢走了

    try {
      const payload = JSON.parse(job.payload);
      await handler(payload);

      await prisma.asyncJob.update({
        where: { id: job.id },
        data: { status: 'done', finishedAt: new Date() },
      });

      processed++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const newAttempts = job.attempts + 1;

      await prisma.asyncJob.update({
        where: { id: job.id },
        data: {
          status: newAttempts >= job.maxAttempts ? 'dead' : 'failed',
          lastError: errorMsg,
          finishedAt: newAttempts >= job.maxAttempts ? new Date() : null,
        },
      });
    }
  }

  return processed;
}
