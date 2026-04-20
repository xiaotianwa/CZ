/**
 * TCG 运营审计日志工具
 * 所有写操作（卡池修改 / 封号 / 补偿 / 赛季结算）必须落 TcgAuditLog
 * 失败仅告警不抛错，不阻塞主流程
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return '127.0.0.1';
}

export interface AuditParams {
  operatorId: string;
  /** 操作动作：card.create / card.update / card.delete / player.ban / player.grant / season.settle / operator.login ... */
  action: string;
  /** 目标资源类型：card / player / match / season / operator */
  targetType?: string;
  /** 目标资源 ID */
  targetId?: string;
  /** 变更前状态（JSON 序列化） */
  before?: unknown;
  /** 变更后状态（JSON 序列化） */
  after?: unknown;
  /** 操作备注（补偿理由、封号原因等） */
  note?: string;
  /** 请求对象，用于记录 IP（可选） */
  req?: NextRequest;
}

/** 写入一条审计日志。失败仅告警，不抛错。 */
export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.tcgAuditLog.create({
      data: {
        operatorId: params.operatorId,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        before: params.before !== undefined ? JSON.stringify(params.before) : null,
        after: params.after !== undefined ? JSON.stringify(params.after) : null,
        note: params.note ?? null,
        ip: params.req ? getClientIp(params.req) : null,
      },
    });
  } catch (err) {
    console.error('[TcgAudit] 写审计日志失败:', err);
  }
}
