'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, ShieldBan, ShieldCheck, MoreHorizontal, Filter, Save, Gift, CheckCircle2, AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import { adminDelete, adminGet, adminPatch, adminPost } from '@/lib/admin-fetch';

interface UserItem {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  badge: string | null;
  customBadge: string | null;
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

const creatableRoleOptions = roleOptions.filter((option) => option.value);

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

function NoticeModal({
  open,
  tone,
  title,
  message,
  onClose,
}: {
  open: boolean;
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      iconClassName: 'text-success',
      badgeClassName: 'bg-green-50 border border-green-100',
      buttonClassName: 'bg-primary hover:bg-primary-hover text-white',
    },
    error: {
      icon: AlertCircle,
      iconClassName: 'text-danger',
      badgeClassName: 'bg-red-50 border border-red-100',
      buttonClassName: 'bg-red-500 hover:bg-red-600 text-white',
    },
    info: {
      icon: Info,
      iconClassName: 'text-primary',
      badgeClassName: 'bg-blue-50 border border-blue-100',
      buttonClassName: 'bg-primary hover:bg-primary-hover text-white',
    },
  }[tone];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 backdrop-blur-[2px] px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[24px] border border-divider bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${config.badgeClassName}`}>
              <Icon className={`h-6 w-6 ${config.iconClassName}`} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-[22px] font-semibold leading-7 text-text-title">{title}</h3>
              <p className="mt-2 text-[15px] leading-7 text-text-body">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end px-6 pb-6">
          <button
            onClick={onClose}
            className={`inline-flex h-11 items-center justify-center rounded-2xl px-6 text-body font-medium transition-colors cursor-pointer ${config.buttonClassName}`}
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}

function GrantPointsModal({
  open,
  mode,
  targetName,
  targetCount,
  points,
  reason,
  loading,
  onPointsChange,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  mode: 'single' | 'batch';
  targetName?: string;
  targetCount?: number;
  points: string;
  reason: string;
  loading: boolean;
  onPointsChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-card shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-heading-sm text-text-title">
              {mode === 'single' ? `为 ${targetName} 增加积分` : '批量增加积分'}
            </h3>
            <p className="text-body text-text-muted mt-1">
              {mode === 'single' ? '本次会同步写入积分记录并发送系统通知。' : `本次会为当前筛选命中的 ${targetCount ?? 0} 位用户同步写入积分记录并发送系统通知。`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-body font-medium text-text-title mb-1.5">增加积分</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={points}
              onChange={(e) => onPointsChange(e.target.value)}
              className="w-full h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="请输入积分数"
            />
          </div>

          <div>
            <label className="block text-body font-medium text-text-title mb-1.5">加分原因</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value.slice(0, 100))}
              rows={4}
              placeholder="例如：活动奖励、补偿发放、运营激励"
              className="w-full rounded-card border border-border bg-white px-3 py-2.5 text-body text-text-title resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-[11px] text-text-muted">用户会在通知中心与积分明细中看到该原因。</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
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
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-btn text-body font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
          >
            <Gift className="w-3.5 h-3.5" />
            {loading ? '发放中...' : '确认发放'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- 操作下拉 ---- */
function ActionMenu({
  user, onToggleActive, onChangeRole, onGrantPoints, onDelete,
}: {
  user: UserItem;
  onToggleActive: (u: UserItem) => void;
  onChangeRole: (u: UserItem, role: string) => void;
  onGrantPoints: (u: UserItem) => void;
  onDelete: (u: UserItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableRoles = ['fan', 'assistant', 'star', 'admin'].filter((r) => r !== user.role);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-btn flex items-center justify-center text-text-muted hover:bg-gray-100 hover:text-text-body transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-40 bg-white rounded-card shadow-lg border border-divider py-1">
          <button
            onClick={() => { setOpen(false); onGrantPoints(user); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-left text-primary hover:bg-primary-bg transition-colors cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            增加积分
          </button>

          <button
            onClick={() => { setOpen(false); onDelete(user); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-body text-left text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除用户
          </button>

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'fan' });
  const [badgeDrafts, setBadgeDrafts] = useState<Record<string, string>>({});
  const [savingBadgeId, setSavingBadgeId] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState<{ open: boolean; mode: 'single' | 'batch'; user: UserItem | null }>({
    open: false,
    mode: 'single',
    user: null,
  });
  const [grantPoints, setGrantPoints] = useState('50');
  const [grantReason, setGrantReason] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const userList = data?.list ?? [];
  const totalPages = data?.pagination?.totalPages ?? 0;
  const totalCount = data?.pagination?.total ?? 0;

  // 确认弹窗
  const [modal, setModal] = useState<{
    open: boolean; title: string; message: string; confirmText: string;
    danger: boolean; action: () => Promise<void>;
  }>({ open: false, title: '', message: '', confirmText: '', danger: false, action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);
  const [notice, setNotice] = useState<{
    open: boolean;
    tone: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({ open: false, tone: 'info', title: '', message: '' });

  const openNotice = (tone: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotice({ open: true, tone, title, message });
  };

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

  useEffect(() => {
    setBadgeDrafts(Object.fromEntries(userList.map((user) => [user.id, user.customBadge ?? ''])));
  }, [userList]);

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
      openNotice('error', '操作失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveBadge = async (user: UserItem) => {
    setSavingBadgeId(user.id);
    try {
      const customBadge = badgeDrafts[user.id]?.trim() || null;
      await adminPatch(`/api/admin/users/${user.id}`, { customBadge });
      await fetchUsers();
    } catch (err) {
      openNotice('error', '标签保存失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setSavingBadgeId(null);
    }
  };

  const openSingleGrantModal = (user: UserItem) => {
    setGrantModal({ open: true, mode: 'single', user });
    setGrantPoints('50');
    setGrantReason('管理员奖励');
  };

  const openBatchGrantModal = () => {
    if (totalCount <= 0) {
      openNotice('info', '暂无可操作用户', '当前筛选结果下没有可加分的用户，请调整筛选条件后再试。');
      return;
    }

    setGrantModal({ open: true, mode: 'batch', user: null });
    setGrantPoints('50');
    setGrantReason('运营活动奖励');
  };

  const resetCreateForm = () => {
    setCreateForm({ name: '', email: '', password: '', role: 'fan' });
    setShowCreateForm(false);
  };

  const handleCreateUser = async () => {
    const payload = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
    };

    if (!payload.name || !payload.email || !payload.password) {
      openNotice('info', '请填写完整信息', '请先补全昵称、邮箱和密码。');
      return;
    }

    if (payload.password.length < 6) {
      openNotice('info', '密码长度不足', '密码至少需要 6 位。');
      return;
    }

    setCreatingUser(true);
    try {
      await adminPost('/api/admin/users', payload);
      resetCreateForm();
      await fetchUsers();
      openNotice('success', '创建成功', `用户「${payload.name}」已创建。`);
    } catch (err) {
      openNotice('error', '创建失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = (user: UserItem) => {
    setModal({
      open: true,
      title: '删除用户',
      message: `确定删除「${user.name}」及其账号内容吗？此操作会删除该账号的帖子、评论、二创等内容，且不可撤销。`,
      confirmText: '确认删除',
      danger: true,
      action: async () => {
        await adminDelete(`/api/admin/users/${user.id}`);
      },
    });
  };

  const handleGrantPoints = async () => {
    const amount = Number(grantPoints);
    const trimmedReason = grantReason.trim();

    if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
      openNotice('info', '积分填写有误', '积分必须是 1 到 10000 之间的整数。');
      return;
    }

    if (trimmedReason.length < 2) {
      openNotice('info', '请补充加分原因', '请填写至少 2 个字的加分原因。');
      return;
    }

    setGrantLoading(true);
    try {
      const payload = grantModal.mode === 'single' && grantModal.user
        ? {
            mode: 'single' as const,
            userId: grantModal.user.id,
            points: amount,
            reason: trimmedReason,
          }
        : {
            mode: 'batch' as const,
            points: amount,
            reason: trimmedReason,
            filters: {
              keyword,
              role: roleFilter,
              status: statusFilter,
            },
          };

      const res = await adminPost<{ count: number; totalGranted: number }>(`/api/admin/users/points`, payload);
      setGrantModal({ open: false, mode: 'single', user: null });
      setGrantReason('');
      await fetchUsers();
      openNotice('success', '积分发放成功', res.message || '积分已经成功发放。');
    } catch (err) {
      openNotice('error', '积分发放失败', err instanceof Error ? err.message : '请稍后重试');
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-body font-semibold text-text-title">筛选条件</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_180px_180px]">
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1.5">搜索用户</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="搜索用户名或邮箱..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                className="w-full h-9 pl-9 pr-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1.5">角色筛选</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary cursor-pointer"
            >
              {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-caption font-medium text-text-muted mb-1.5">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary cursor-pointer"
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <p className="text-caption text-text-muted mt-3">
          当前批量加积分会基于这里的筛选结果执行。
          当前条件：关键词 {keyword.trim() ? `「${keyword.trim()}」` : '未设置'}，角色 {roleOptions.find((o) => o.value === roleFilter)?.label ?? '全部角色'}，状态 {statusOptions.find((o) => o.value === statusFilter)?.label ?? '全部状态'}。
        </p>
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-text-title">新增用户</h3>
            <p className="text-caption text-text-muted mt-1">后台可直接创建前台用户账号，无需验证码。</p>
          </div>
          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-btn text-body font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? '收起表单' : '新增用户'}
          </button>
        </div>

        {showCreateForm && (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="昵称"
                className="h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="邮箱"
                className="h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="密码（至少 6 位）"
                className="h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                className="h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary cursor-pointer"
              >
                {creatableRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-btn text-body font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {creatingUser ? '创建中...' : '确认创建'}
              </button>
              <button
                onClick={resetCreateForm}
                disabled={creatingUser}
                className="inline-flex items-center justify-center h-9 px-4 rounded-btn text-body font-medium text-text-body bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-text-title">批量增加积分</h3>
            <p className="text-caption text-text-muted mt-1">
              按当前筛选结果批量发放积分，并同步写入通知与积分记录。当前命中 {totalCount} 位用户。
            </p>
          </div>
          <button
            onClick={openBatchGrantModal}
            disabled={totalCount <= 0}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-btn text-body font-medium text-white bg-primary hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift className="w-4 h-4" />
            按当前筛选批量加积分
          </button>
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
                <th className="text-left px-4 py-3 font-medium text-text-muted w-56">自定义标签</th>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={badgeDrafts[user.id] ?? ''}
                        onChange={(e) => setBadgeDrafts((prev) => ({ ...prev, [user.id]: e.target.value.slice(0, 12) }))}
                        placeholder="留空则不显示"
                        className="h-8 w-full min-w-0 rounded-btn border border-border bg-white px-2.5 text-caption text-text-title focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={() => handleSaveBadge(user)}
                        disabled={savingBadgeId === user.id}
                        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-btn border border-border text-text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                        title="保存自定义标签"
                      >
                        <Save className={`w-3.5 h-3.5 ${savingBadgeId === user.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    {user.customBadge ? (
                      <p className="mt-1 text-[11px] text-text-muted">当前：{user.customBadge}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-text-disabled">当前无自定义标签</p>
                    )}
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
                    <ActionMenu user={user} onToggleActive={handleToggleActive} onChangeRole={handleChangeRole} onGrantPoints={openSingleGrantModal} onDelete={handleDeleteUser} />
                  </td>
                </tr>
              ))}
              {userList.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-text-muted">暂无用户</td></tr>
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

      <GrantPointsModal
        open={grantModal.open}
        mode={grantModal.mode}
        targetName={grantModal.user?.name}
        targetCount={totalCount}
        points={grantPoints}
        reason={grantReason}
        loading={grantLoading}
        onPointsChange={setGrantPoints}
        onReasonChange={setGrantReason}
        onConfirm={handleGrantPoints}
        onCancel={() => setGrantModal({ open: false, mode: 'single', user: null })}
      />

      <NoticeModal
        open={notice.open}
        tone={notice.tone}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
