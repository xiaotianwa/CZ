'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Clock } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
  sortOrder: number;
}

const typeLabel: Record<string, string> = { debut: '出道', award: '奖项', release: '发布', milestone: '里程碑', event: '事件' };
const typeColors: Record<string, string> = { debut: 'tag-success', award: 'tag-primary', release: 'tag-primary', milestone: 'bg-orange-50 text-warning', event: 'tag-muted' };
const defaultForm = { date: '', title: '', description: '', type: 'event', sortOrder: 0 };

export default function AdminTimelinePage() {
  const [list, setList] = useState<TimelineItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchList = useCallback(async () => {
    try {
      const res = await adminGet<TimelineItem[]>('/api/admin/timeline');
      setList(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };
  const openEdit = (item: TimelineItem) => {
    setForm({ date: item.date, title: item.title, description: item.description, type: item.type, sortOrder: item.sortOrder });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) { await adminPut(`/api/admin/timeline/${editing.id}`, form); }
      else { await adminPost('/api/admin/timeline', form); }
      setShowForm(false);
      fetchList();
    } catch (err) { setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/timeline/${id}`);
    fetchList();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {list.length} 个事件</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加事件
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* 固定头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑事件' : '添加事件'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">事件标题</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="输入事件标题"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">日期</label>
                  <input
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    placeholder="如 2024年7月"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">类型</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                  >
                    {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="详细描述该事件..."
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">排序</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* 固定底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '添加事件'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {list.map((item) => (
          <div key={item.id} className="card flex items-center gap-4">
            <div className="w-20 text-caption text-text-muted font-medium flex-shrink-0">{item.date}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-text-title">{item.title}</h3>
                <span className={`tag text-[10px] ${typeColors[item.type] || 'tag-muted'}`}>{typeLabel[item.type]}</span>
              </div>
              <p className="text-caption text-text-muted mt-0.5 line-clamp-1">{item.description}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(item)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="card text-center text-text-muted py-8">暂无时间线事件</div>}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除事件"
        message="确定要删除这个时间线事件吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
