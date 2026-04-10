import { clearTokenCookie, ADMIN_COOKIE_NAME } from '@/lib/auth';
import { ok } from '@/lib/api';

export async function POST() {
  const response = ok(null, '已退出登录');
  clearTokenCookie(response, ADMIN_COOKIE_NAME);
  return response;
}
