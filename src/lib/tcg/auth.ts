/**
 * TCG 运营后台 —— 独立鉴权层
 * 与社区 /admin 完全隔离：独立 cookie + 独立 JWT secret（fallback ADMIN_JWT_SECRET）
 * 互不干扰：同一浏览器可同时持有 admin_token 与 tcg_admin_token
 */

import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';

function getTcgSecret(): string {
  const s = process.env.TCG_JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!s) {
    throw new Error('环境变量 TCG_JWT_SECRET 或 ADMIN_JWT_SECRET 必须设置，服务拒绝启动');
  }
  return s;
}

const JWT_EXPIRES_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export const TCG_COOKIE_NAME = 'tcg_admin_token';

export type TcgRole = 'tcg_super' | 'tcg_ops' | 'tcg_editor';

export interface TcgPayload {
  id: string;
  email: string;
  role: TcgRole;
  type: 'tcg';
}

// ===== 签发 / 验证 =====

export function signTcgToken(payload: Omit<TcgPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'tcg' }, getTcgSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyTcgToken(token: string): TcgPayload | null {
  try {
    const decoded = jwt.verify(token, getTcgSecret()) as TcgPayload;
    if (decoded.type !== 'tcg') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ===== Cookie =====

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export function setTcgCookie(res: NextResponse, token: string): void {
  res.cookies.set(TCG_COOKIE_NAME, token, cookieOptions());
}

export function clearTcgCookie(res: NextResponse): void {
  res.cookies.set(TCG_COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 });
}

// ===== 请求解析 =====

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies.get(TCG_COOKIE_NAME)?.value ?? null;
}

export async function getCurrentTcgAdmin(req: NextRequest): Promise<TcgPayload | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyTcgToken(token);
}

// ===== 守卫（分级） =====

/** 需要任意 TCG 运营登录（tcg_super / tcg_ops / tcg_editor 均可） */
export async function requireTcgAdmin(req: NextRequest): Promise<TcgPayload> {
  const admin = await getCurrentTcgAdmin(req);
  if (!admin) {
    throw new AuthError('TCG 运营账号未登录', 401);
  }
  return admin;
}

/** 仅 tcg_super 可访问（运营账号管理 / 审计日志） */
export async function requireTcgSuper(req: NextRequest): Promise<TcgPayload> {
  const admin = await requireTcgAdmin(req);
  if (admin.role !== 'tcg_super') {
    throw new AuthError('权限不足，仅超管可访问', 403);
  }
  return admin;
}

/** 需要写权限（super + ops）：卡池增删 / 封号 / 补偿 / 赛季操作 */
export async function requireTcgOps(req: NextRequest): Promise<TcgPayload> {
  const admin = await requireTcgAdmin(req);
  if (admin.role === 'tcg_editor') {
    throw new AuthError('权限不足，仅超管和运营可写操作', 403);
  }
  return admin;
}
