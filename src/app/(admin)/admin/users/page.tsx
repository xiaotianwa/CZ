'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, ShieldBan, ShieldCheck, MoreHorizontal, Filter } from 'lucide-react';
import { adminGet, adminPatch } from '@/lib/admin-fetch';

interface UserItem {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  points: number;
  isActive: boolean;
  createdAt: string;
  _count: { posts: number; comments: number };
}

interface PaginatedResponse {
  list: UserItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const roleConfig: Record<string, { label: string; className: string; dot: string }> = {
  admin: { label: '管理员', className: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-btn text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200/80', dot: 'bg-red-400' },
  star: { label: '董事长', className: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-btn text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80', dot: 'bg-amber-400' },
  assistant: { label: '传媒成员', className: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-btn text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200/80', dot: 'bg-blue-400' },
  fan: { label: '粉丝', className: 'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-btn text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-200/80', dot: 'bg-gray-300' },
};

const roleOptions = [
  { value: '', label: '全部角色' },
  { value: 'fan', label: '粉丝' },
  { value: 'assistant', label: '传媒成员' },
  { value: 'star', label: '董事长' },
  { value: 'admin', label: '管理员' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'disabled', label: '已禁用' },
];

/* ---- 确认弹窗 ---- */
function ConfirmModal({
  open, title, message, confirmText, confirmDanger, loading, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmText: string;
  confirmDanger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-card shadow-xl w-full max-w-sm mx-4 p-5">
        <h3 className="text-heading-sm text-text-title mb-2">{title}</h3>
        <p className="text-body text-text-body mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-8 px-4 rounded-btn text-body font-medium text-text-body bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`h-8 px-4 rounded-btn text-body font-medium text-white transition-colors cursor-pointer disabled:opacity-50 ${
              confirmDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- 操作下拉 ---- */
function ActionMenu({
  user, onToggleActive, onChangeRole,
}: {
  user: UserItem;
  onToggleActive: (u: UserItem) => void;
  onChangeRole: (u: UserItem, role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableRoles = ['fan', 'assistant', 'star'].filter((r) => r !== user.role);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-btn flex items-center justify-center text-text-muted hover:bg-gray-100 hover:text-text-body transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-36 bg-white rounded-card shadow-lg border border-divider py-1">
          {/* 禁用/启用 */}
          {user.role !== 'star' && (
            <button
              onClick={() => { setOpen(false); onToggleActive(user); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-body text-left transition-colors cursor-pointer ${
                user.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
              }`}
            >
              {user.isActive ? <ShieldBan className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {user.isActive ? '禁用账号' : '启用账号'}
            </button>
          )}

          {/* 角色变更 */}
          {availableRoles.length > 0 && (
            <>
              <div className="border-t border-divider my-1" />
              <p className="px-3 py-1 text-[10px] text-text-muted font-medium">变更角色</p>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => { setOpen(false); onChangeRole(user, r); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-left text-text-body hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${roleConfig[r]?.dot || 'bg-gray-300'}`} />
                  {roleConfig[r]?.label || r}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- 主页面 ---- */
export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const userList = data?.list ?? [];
  const totalPages = data?.pagination?.totalPages ?? 0;
  const totalCount = data?.pagination?.total ?? 0;

  // 确认弹窗
  const [modal, setModal] = useState<{
    open: boolean; title: string; message: string; confirmText: string;
    danger: boolean; action: () => Promise<void>;
  }>({ open: false, title: '', message: '', confirmText: '', danger: false, action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('keyword', keyword);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await adminGet<PaginatedResponse>(`/api/admin/users?${params}`);
      setData(res.data);
    } catch (err) { console.error(err); }
  }, [page, keyword, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = (user: UserItem) => {
    const willDisable = user.isActive;
    setModal({
      open: true,
      title: willDisable ? '禁用账号' : '启用账号',
      message: willDisable
        ? `确定禁用「${user.name}」的账号？禁用后该用户将无法登录。`
        : `确定启用「${user.name}」的账号？`,
      confirmText: willDisable ? '确认禁用' : '确认启用',
      danger: willDisable,
      action: async () => {
        await adminPatch(`/api/admin/users/${user.id}`, { isActive: !user.isActive });
      },
    });
  };

  const handleChangeRole = (user: UserItem, newRole: string) => {
    const roleName = roleConfig[newRole]?.label || newRole;
    setModal({
      open: true,
      title: '变更角色',
      message: `确定将「${user.name}」的角色变更为「${roleName}」？`,
      confirmText: '确认变更',
      danger: false,
      action: async () => {
        await adminPatch(`/api/admin/users/${user.id}`, { role: newRole });
      },
    });
  };

  const confirmAction = async () => {
    setModalLoading(true);
    try {
      await modal.action();
      setModal((m) => ({ ...m, open: false }));
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索用户名或邮箱..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary cursor-pointer"
          >
            {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary cursor-pointer"
          >
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* 表格 */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-divider bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-text-muted">用户</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted w-32">角色</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">等级</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">积分</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">帖子</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">评论</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-32">注册时间</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-24">状态</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.id} className={`border-b border-divider last:border-0 hover:bg-gray-50/30 ${!user.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-body font-medium text-text-title">{user.name}</p>
                        <p className="text-caption text-text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const cfg = roleConfig[user.role] || roleConfig.fan;
                      return (
                        <span className={cfg.className}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">Lv.{user.level}</td>
                  <td className="px-4 py-3 text-center text-text-muted">{user.points.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-text-muted">{user._count.posts}</td>
                  <td className="px-4 py-3 text-center text-text-muted">{user._count.comments}</td>
                  <td className="px-4 py-3 text-center text-caption text-text-muted">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`tag text-[10px] ${user.isActive ? 'tag-success' : 'tag bg-red-50 text-danger'}`}>
                      {user.isActive ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ActionMenu user={user} onToggleActive={handleToggleActive} onChangeRole={handleChangeRole} />
                  </td>
                </tr>
              ))}
              {userList.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">暂无用户</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <span className="text-caption text-text-muted">共 {totalCount} 人</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors cursor-pointer ${p === page ? 'bg-primary text-white' : 'text-text-body hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 确认弹窗 */}
      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        confirmDanger={modal.danger}
        loading={modalLoading}
        onConfirm={confirmAction}
        onCancel={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
