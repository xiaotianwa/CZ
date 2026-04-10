import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const checks: Record<string, string> = {};

  // 数据库连通性检查
  try {
    await prisma.siteConfig.findFirst();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const latency = Date.now() - start;
  const healthy = checks.database === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      latency: `${latency}ms`,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
