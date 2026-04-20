import { NextRequest } from 'next/server';
import { clearTcgCookie, getCurrentTcgAdmin } from '@/lib/tcg/auth';
import { auditLog } from '@/lib/tcg/audit';
import { ok } from '@/lib/api';

export async function POST(req: NextRequest) {
  const admin = await getCurrentTcgAdmin(req);
  if (admin) {
    await auditLog({ operatorId: admin.id, action: 'operator.logout', req });
  }
  const response = ok(null, '已退出 TCG 运营后台');
  clearTcgCookie(response);
  return response;
}
