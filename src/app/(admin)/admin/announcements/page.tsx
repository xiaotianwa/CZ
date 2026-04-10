'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Megaphone, Eye, EyeOff, ExternalLink, CalendarClock } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: string;
  image: string | null;
  link: string | null;
  linkText: string | null;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  sortOrder: number;
  createdAt: string;
}

interface PaginatedResponse {
  list: AnnouncementItem[];
  pagination: { total: number };
}

const typeMap: Record<string, { label: string; cls: string }> = {
  info: { label: '通知', cls: 'bg-primary-bg text-primary' },
  warning: { label: '警告', cls: 'bg-orange-50 text-warning' },
  event: { label: '活动', cls: 'bg-green-50 text-success' },
  update: { label: '更新', cls: 'bg-gray-100 text-text-body' },
};

const defaultForm = {
  title: '',
  content: '',
  type: 'info',
  image: null as string | null,
  link: null as string | null,
  linkText: null as string | null,
  isActive: true,
  startAt: '',
  endAt: '',
  sortOrder: 0,
};

function toLocalInput(dateStr: string | null) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  } catch { return ''; }
}

export default function AdminAnnouncementsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchList = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/announcements?pageSize=50');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };

  const openEdit = (item: AnnouncementItem) => {
    setForm({
      title: item.title,
      content: item.content,
      type: item.type,
      image: item.image,
      link: item.link,
      linkText: item.linkText,
      isActive: item.isActive,
      startAt: toLocalInput(item.startAt),
      endAt: toLocalInput(item.endAt),
      sortOrder: item.sortOrder,
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setToast({ open: true, message: '标题不能为空', type: 'error' }); return;
    }
    if (!form.content.trim()) {
      setToast({ open: true, message: '内容不能为空', type: 'error' }); return;
    }
    try {
      const payload = {
        ...form,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
        image: form.image || null,
        link: form.link || null,
        linkText: form.linkText || null,
      };
      if (editing) {
        await adminPut(`/api/admin/announcements/${editing.id}`, payload);
      } else {
        await adminPost('/api/admin/announcements', payload);
      }
      setShowForm(false);
      fetchList();
      setToast({ open: true, message: editing ? '更新成功' : '创建成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleToggle = async (item: AnnouncementItem) => {
    try {
      await adminPut(`/api/admin/announcements/${item.id}`, { isActive: !item.isActive });
      fetchList();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => { setConfirmState({ open: true, id }); };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/announcements/${id}`);
      fetchList();
      setToast({ open: true, message: '删除成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  }

  const activeCount = data?.list.filter((a) => a.isActive).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 条公告</span>
          <span className="tag-success text-caption">{activeCount} 条启用中</span>
        </div>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 发布公告
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑公告' : '发布公告'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* 标题 */}
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">标题</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="公告标题"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              {/* 类型 */}
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">类型</label>
                <div className="flex gap-2">
                  {Object.entries(typeMap).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, type: key })}
                      className={`h-8 px-3 rounded-full text-caption font-medium transition-all cursor-pointer border ${
                        form.type === key
                          ? `${val.cls} border-current`
                          : 'bg-white text-text-muted border-border hover:border-gray-300'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 内容 */}
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="公告内容，支持多行文本"
                  rows={4}
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              {/* 图片 */}
              <ImageUpload
                value={form.image || ''}
                onChange={(url) => setForm({ ...form, image: url || null })}
                category="cover"
                label="配图（可选）"
                aspect="aspect-[2/1]"
              />

              <div className="border-t border-border/40" />

              {/* 链接 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">跳转链接</label>
                  <input
                    value={form.link || ''}
                    onChange={(e) => setForm({ ...form, link: e.target.value || null })}
                    placeholder="https://..."
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">按钮文字</label>
                  <input
                    value={form.linkText || ''}
                    onChange={(e) => setForm({ ...form, linkText: e.target.value || null })}
                    placeholder="查看详情"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 定时 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">开始时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-caption focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">结束时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-caption focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* 排序 + 状态 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">排序权重</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`w-full h-9 rounded-lg border text-body font-medium cursor-pointer transition-colors ${
                      form.isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-gray-50/50 text-text-muted'
                    }`}
                  >
                    {form.isActive ? '启用中' : '已停用'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '发布公告'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="grid gap-3">
        {data?.list.map((item) => {
          const tp = typeMap[item.type] || typeMap.info;
          return (
            <div key={item.id} className={`card transition-opacity ${!item.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                {item.image ? (
                  <div className="w-16 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-body font-semibold text-text-title truncate">{item.title}</h3>
                    <span className={`tag text-[10px] ${tp.cls}`}>{tp.label}</span>
                    <span className={`tag text-[10px] ${item.isActive ? 'tag-success' : 'tag-muted'}`}>
                      {item.isActive ? '启用' : '停用'}
                    </span>
                  </div>
                  <p className="text-caption text-text-body line-clamp-1">{item.content}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                    <span>{timeAgo(item.createdAt)}</span>
                    {item.link && (
                      <span className="inline-flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" /> {item.linkText || '链接'}
                      </span>
                    )}
                    {(item.startAt || item.endAt) && (
                      <span className="inline-flex items-center gap-0.5">
                        <CalendarClock className="w-3 h-3" /> 定时
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(item)}
                    className={`p-1.5 rounded-btn cursor-pointer transition-colors ${item.isActive ? 'text-text-muted hover:bg-gray-100' : 'text-text-muted hover:bg-gray-100'}`}
                    title={item.isActive ? '停用' : '启用'}
                  >
                    {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {data && data.list.length === 0 && (
          <div className="card py-12 text-center">
            <Megaphone className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body text-text-muted">暂无公告</p>
            <p className="text-caption text-text-muted mt-1">点击"发布公告"创建首页公告弹窗</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除公告"
        message="确定要删除这条公告吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
