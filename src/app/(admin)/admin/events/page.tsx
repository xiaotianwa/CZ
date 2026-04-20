'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, CalendarDays, MapPin, FileText } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface EventItem {
  id: string;
  title: string;
  description: string;
  cover: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  participants: number;
  isActive: boolean;
}

interface PaginatedResponse {
  list: EventItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const defaultForm = { title: '', description: '', cover: '', startTime: '', endTime: '', location: '', status: 'upcoming' as string, participants: 0, isActive: true };

export default function AdminEventsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/events?pageSize=50');
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: EventItem) => {
    setForm({
      title: item.title,
      description: item.description,
      cover: item.cover,
      startTime: item.startTime.slice(0, 16),
      endTime: item.endTime.slice(0, 16),
      location: item.location,
      status: item.status,
      participants: item.participants,
      isActive: item.isActive,
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminPut(`/api/admin/events/${editing.id}`, form);
      } else {
        await adminPost('/api/admin/events', form);
      }
      setShowForm(false);
      fetchEvents();
    } catch (err) { setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/events/${id}`);
    fetchEvents();
  };

  const statusLabel: Record<string, string> = { upcoming: '即将开始', ongoing: '进行中', ended: '已结束' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 个活动</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 创建活动
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* 固定头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑活动' : '创建活动'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 基本信息 — 双栏：左封面 右表单 */}
              <div className="flex gap-5">
                <div className="w-44 flex-shrink-0">
                  <ImageUpload
                    value={form.cover}
                    onChange={(url) => setForm({ ...form, cover: url })}
                    category="event"
                    label="封面"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">活动标题</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="输入活动名称"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">活动地点</label>
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="如抹音直播间"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="upcoming">即将开始</option>
                      <option value="ongoing">进行中</option>
                      <option value="ended">已结束</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-caption text-text-body">显示</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 时间区 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" /> 时间安排
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">开始时间</label>
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">结束时间</label>
                    <input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 描述区 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> 活动描述
                </h4>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="详细描述活动内容..."
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* 固定底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建活动'}</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {loading && <div className="card text-center text-text-muted py-8">加载中...</div>}
        {data?.list.map((event) => (
          <div key={event.id} className="card flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-text-title">{event.title}</h3>
                <span className={`tag text-[10px] ${event.status === 'upcoming' ? 'tag-primary' : event.status === 'ongoing' ? 'tag-success' : 'tag-muted'}`}>
                  {statusLabel[event.status]}
                </span>
              </div>
              <p className="text-caption text-text-muted mt-1 line-clamp-1">{event.description}</p>
              <div className="flex gap-4 mt-2 text-caption text-text-muted">
                <span>{event.location}</span>
                <span>{new Date(event.startTime).toLocaleString('zh-CN')}</span>
                <span>{event.participants.toLocaleString()} 人</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(event)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(event.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除活动"
        message="确定要删除这个活动吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
