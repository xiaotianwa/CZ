'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Shield, ShieldCheck, ShieldAlert, Search, Pencil, X } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

interface AdminItem {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  list: AdminItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const roleMap: Record<string, { label: string; cls: string; icon: typeof Shield }> = {
  super_admin: { label: '超级管理员', cls: 'tag-danger', icon: ShieldAlert },
  admin: { label: '管理员', cls: 'tag-primary', icon: ShieldCheck },
  editor: { label: '编辑', cls: 'tag-muted', icon: Shield },
};

export default function AdminsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('keyword', keyword);
      const res = await adminGet<PaginatedResponse>(`/api/admin/admins?${params}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'admin' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return;

    try {
      if (editingId) {
        const updateData: Record<string, string> = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password.trim()) updateData.password = formData.password;
        await adminPut(`/api/admin/admins/${editingId}`, updateData);
      } else {
        if (!formData.password.trim() || formData.password.length < 6) {
          alert('密码至少6位');
          return;
        }
        await adminPost('/api/admin/admins', formData);
      }
      resetForm();
      fetchAdmins();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (admin: AdminItem) => {
    setFormData({ name: admin.name, email: admin.email, password: '', role: admin.role });
    setEditingId(admin.id);
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await adminPut(`/api/admin/admins/${id}`, { isActive: !isActive });
    fetchAdmins();
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/admins/${id}`);
      fetchAdmins();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索管理员..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption"
        >
          <Plus className="w-4 h-4" />
          添加管理员
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-semibold text-text-title">
              {editingId ? '编辑管理员' : '添加管理员'}
            </h3>
            <button onClick={resetForm} className="p-1 rounded-btn hover:bg-gray-100 text-text-muted cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="email"
              placeholder="邮箱"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="password"
              placeholder={editingId ? '留空则不修改密码' : '密码（至少6位）'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary"
            >
              <option value="admin">管理员</option>
              <option value="editor">编辑</option>
              <option value="super_admin">超级管理员</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary h-8 px-4 text-caption">
              {editingId ? '保存' : '创建'}
            </button>
            <button onClick={resetForm} className="btn-outline h-8 px-4 text-caption">取消</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-divider bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-text-muted">名称</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">邮箱</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-28">角色</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">状态</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-36">最后登录</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">加载中...</td></tr>
              )}
              {!loading && data?.list.map((admin) => {
                const r = roleMap[admin.role] || roleMap.editor;
                return (
                  <tr key={admin.id} className="border-b border-divider last:border-0 hover:bg-gray-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-bg flex items-center justify-center text-primary text-caption font-bold flex-shrink-0">
                          {admin.name[0]}
                        </div>
                        <span className="font-medium">{admin.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{admin.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`tag text-[10px] ${r.cls}`}>{r.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`tag text-[10px] ${admin.isActive ? 'tag-success' : 'tag-muted'}`}>
                        {admin.isActive ? '正常' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-text-muted text-caption">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString('zh-CN') : '从未'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(admin)}
                          className="p-1.5 rounded-btn text-text-muted hover:text-primary hover:bg-primary-bg transition-colors cursor-pointer"
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(admin.id, admin.isActive)}
                          className={`p-1.5 rounded-btn transition-colors cursor-pointer ${
                            admin.isActive ? 'text-text-muted hover:text-warning hover:bg-orange-50' : 'text-warning hover:text-success hover:bg-green-50'
                          }`}
                          title={admin.isActive ? '禁用' : '启用'}
                        >
                          {admin.isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setConfirmState({ open: true, id: admin.id })}
                          className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && data?.list.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">暂无管理员</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <span className="text-caption text-text-muted">共 {data.pagination.total} 条</span>
            <div className="flex gap-1">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors cursor-pointer ${
                    p === page ? 'bg-primary text-white' : 'text-text-body hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除管理员"
        message="确定要删除该管理员账号吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
    </div>
  );
}
