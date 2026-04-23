/**
 * 内部 API：处理异步任务队列
 * 由 cron / pm2 定时调用，或由外部触发
 *
 * 安全：通过 INTERNAL_API_SECRET 环境变量校验
 */

import { NextRequest } from 'next/server';
import { ok, fail, handleError } from '@/lib/api';
import { processJobs } from '@/lib/async-job';
import { registerAllHandlers } from '@/lib/job-handlers';
import { timingSafeEqualStr } from '@/lib/timing-safe';

let handlersRegistered = false;

export async function POST(req: NextRequest) {
  try {
    // 鉴权：校验内部 API 密钥（必须配置）
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret) {
      return fail('INTERNAL_API_SECRET not configured', 500);
    }
    const authHeader = req.headers.get('Authorization') || '';
    if (!timingSafeEqualStr(authHeader, `Bearer ${secret}`)) {
      return fail('Unauthorized', 401);
    }

    // 懒注册 handlers
    if (!handlersRegistered) {
      registerAllHandlers();
      handlersRegistered = true;
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = (body as { batchSize?: number }).batchSize || 20;

    const processed = await processJobs(batchSize);

    return ok({ processed });
  } catch (err) {
    return handleError(err);
  }
}
