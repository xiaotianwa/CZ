/**
 * 社区后台审计日志工具
 *
 * 所有 /api/admin/* 下的**写操作**（删除、禁用、角色变更、公告发布/撤回、反馈处理等）
 * 必须调用 {@link logAdminAction} 留档。失败仅告警不抛错，不阻塞业务主流程。
 *
 * 与 TCG 审计 (TcgAuditLog) 命名空间独立。字段结构一致以便后台前端可复用展示组件。
 */

import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

/** 允许的动作命名空间前缀（参考，仅用于文档提示） */
export type AdminAuditAction =
  | 'user.delete'
  | 'user.role_change'
  | 'user.activate'
  | 'user.deactivate'
  | 'user.badge_update'
  | 'post.delete'
  | 'post.update'
  | 'post.pin'
  | 'post.unpin'
  | 'post.hide'
  | 'comment.delete'
  | 'announcement.create'
  | 'announcement.update'
  | 'announcement.delete'
  | 'feedback.update'
  | 'feedback.delete'
  | 'meme.create'
  | 'meme.update'
  | 'meme.delete'
  | 'settings.update'
  | 'banned_words.create'
  | 'banned_words.delete'
  | 'report.resolve'
  | (string & {}); // 允许自定义扩展

export interface LogAdminActionParams {
  /** 操作管理员信息（通常来自 requireAdmin() 返回值） */
  operator: { id: string; email?: string };
  /** 操作类型，建议遵循 "<resource>.<verb>" 命名（见 AdminAuditAction） */
  action: AdminAuditAction;
  /** 目标资源类型 */
  targetType?: string;
  /** 目标资源 ID */
  targetId?: string;
  /** 变更前状态（会被 JSON 序列化） */
  before?: unknown;
  /** 变更后状态（会被 JSON 序列化） */
  after?: unknown;
  /** 备注，例如封号原因、下架理由 */
  note?: string;
  /** 请求对象，用于提取 IP + User-Agent */
  req?: NextRequest;
}

/** 从请求头安全提取客户端 IP（优先 X-Real-IP，兜底 X-Forwarded-For 首段） */
function extractIp(req: NextRequest): string | null {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * 写入一条社区后台审计日志。
 *
 * - 失败仅记录 console.error，不抛异常、不阻塞调用方
 * - 返回 Promise<void>，调用方可选择 await 或 fire-and-forget
 */
export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        operatorId: params.operator.id,
        operatorEmail: params.operator.email ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        before: params.before !== undefined ? JSON.stringify(params.before) : null,
        after: params.after !== undefined ? JSON.stringify(params.after) : null,
        note: params.note ?? null,
        ip: params.req ? extractIp(params.req) : null,
        ua: params.req ? (params.req.headers.get('user-agent') || null) : null,
      },
    });
  } catch (err) {
    console.error('[AdminAudit] 写审计日志失败:', err);
  }
}
