import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { isTokenRevoked } from '@/lib/token-blacklist';

// 前台用户和管理员使用不同密钥，Token 完全隔离
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`环境变量 ${name} 未设置，服务拒绝启动`);
  }
  return value;
}

const USER_JWT_SECRET = requireEnv('JWT_SECRET');
const ADMIN_JWT_SECRET = requireEnv('ADMIN_JWT_SECRET');
const JWT_EXPIRES_IN = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export const USER_COOKIE_NAME = 'token';
export const ADMIN_COOKIE_NAME = 'admin_token';

export type TokenType = 'user' | 'admin';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  type: TokenType; // 标识来源
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// ===== 签发 =====

export function signUserToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'user' }, USER_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signAdminToken(payload: Omit<JwtPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ===== 验证 =====

export async function verifyUserToken(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, USER_JWT_SECRET) as JwtPayload & { iat?: number };
    if (decoded.type !== 'user') return null;
    if (decoded.iat && await isTokenRevoked(decoded.id, decoded.iat)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as JwtPayload & { iat?: number };
    if (decoded.type !== 'admin') return null;
    if (decoded.iat && await isTokenRevoked(decoded.id, decoded.iat)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ===== Cookie 工具 =====

/**
 * 生成 cookie 选项。
 * 注意：同时设置 maxAge（Max-Age）和 expires（Expires），
 * 因为部分移动端浏览器（尤其 iOS Safari / 微信内置浏览器）
 * 对只有 Max-Age 没有 Expires 的 cookie 会视为 session cookie，
 * 关闭浏览器/后台切出即丢失，导致用户需反复登录。
 */
function cookieOptions(maxAgeSec: number = COOKIE_MAX_AGE) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
    expires: new Date(Date.now() + maxAgeSec * 1000),
  };
}

/**
 * 会话 cookie 选项：不设置 maxAge / expires，
 * 浏览器按"关闭即失效"处理。用于管理员登录：关闭浏览器必须重新登录。
 */
function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    // 不设 maxAge / expires：浏览器会话结束即删
  };
}

export function applyPrivateNoStoreHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Vary', 'Cookie, Authorization');
  return res;
}

export function setTokenCookie(
  res: NextResponse,
  token: string,
  cookieName: string,
  opts?: { sessionOnly?: boolean },
): void {
  applyPrivateNoStoreHeaders(res);
  const options = opts?.sessionOnly ? sessionCookieOptions() : cookieOptions();
  res.cookies.set(cookieName, token, options);
}

export function clearTokenCookie(res: NextResponse, cookieName: string): void {
  applyPrivateNoStoreHeaders(res);
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
    expires: new Date(0), // 1970-01-01，强制浏览器立即删除
  });
}

// ===== 请求解析 =====

function getTokenFromRequest(req: NextRequest, cookieName: string): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies.get(cookieName)?.value ?? null;
}

export async function getCurrentUser(req: NextRequest): Promise<JwtPayload | null> {
  const token = getTokenFromRequest(req, USER_COOKIE_NAME);
  if (!token) return null;
  return verifyUserToken(token);
}

export async function getCurrentAdmin(req: NextRequest): Promise<JwtPayload | null> {
  const token = getTokenFromRequest(req, ADMIN_COOKIE_NAME);
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function requireAdmin(req: NextRequest): Promise<JwtPayload> {
  const admin = await getCurrentAdmin(req);
  if (!admin) {
    throw new AuthError('管理员未登录', 401);
  }
  return admin;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
