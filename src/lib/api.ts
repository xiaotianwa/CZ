import { NextResponse } from 'next/server';
import { AuthError } from './auth';

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
