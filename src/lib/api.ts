import { NextResponse } from 'next/server';
import { AuthError } from './auth';

/* ------------------------------------------------------------------ */
/*  服务端响应辅助                                                      */
/* ------------------------------------------------------------------ */

export function ok<T>(data: T, message: string = 'success') {
  return NextResponse.json({ code: 0, message, data });
}

export function paginated<T>(data: T[], total: number, page: number, pageSize: number) {
  return NextResponse.json({
    code: 0,
    message: 'success',
    data: {
      list: data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
}

export function fail(message: string, code: number = 400) {
  return NextResponse.json({ code, message, data: null }, { status: code });
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) {
    return fail(err.message, err.status);
  }
  console.error('[API Error]', err);
  return fail('服务器内部错误', 500);
}

export function getSearchParams(url: string) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  return { page, pageSize, keyword, status, category, sort, order };
}

/* ------------------------------------------------------------------ */
/*  客户端 API 封装                                                     */
/* ------------------------------------------------------------------ */

interface ApiResult {
  ok: boolean;
  data: unknown;
  message: string;
  code: number;
}

async function request(method: string, url: string, body?: unknown): Promise<ApiResult> {
  const opts: RequestInit = {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const json = await res.json();
  return {
    ok: json.code === 0 || json.code === 200,
    data: json.data ?? null,
    message: json.message ?? '',
    code: json.code ?? res.status,
  };
}

export const api = {
  get: (url: string) => request('GET', url),
  post: (url: string, body?: unknown) => request('POST', url, body),
  put: (url: string, body?: unknown) => request('PUT', url, body),
  patch: (url: string, body?: unknown) => request('PATCH', url, body),
  delete: (url: string) => request('DELETE', url),
};
