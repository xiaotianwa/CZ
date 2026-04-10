'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Eye, EyeOff, Layers } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface SlideItem {
  id: string;
  image: string;
  alt: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
}

const defaultForm = { image: '', alt: '', link: '', sortOrder: 0, isActive: true };

export default function AdminSlidesPage() {
  const [list, setList] = useState<SlideItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SlideItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchList = useCallback(async () => {
    try {
      const res = await adminGet<SlideItem[]>('/api/admin/slides');
      setList(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };
  const openEdit = (item: SlideItem) => {
    setForm({ image: item.image, alt: item.alt, link: item.link || '', sortOrder: item.sortOrder, isActive: item.isActive });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) { await adminPut(`/api/admin/slides/${editing.id}`, form); }
      else { await adminPost('/api/admin/slides', form); }
      setShowForm(false);
      fetchList();
    } catch (err) { setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' }); }
  };

  const handleToggle = async (item: SlideItem) => {
    await adminPut(`/api/admin/slides/${item.id}`, { isActive: !item.isActive });
    fetchList();
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/slides/${id}`);
    fetchList();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {list.length} 张轮播</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加轮播
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
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑轮播' : '添加轮播'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <ImageUpload
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                category="cover"
                label="轮播图片"
                aspect="aspect-[2.4/1]"
              />
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">描述文字</label>
                <input
                  value={form.alt}
                  onChange={(e) => setForm({ ...form, alt: e.target.value })}
                  placeholder="输入轮播图描述"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">跳转链接（可选）</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">排序</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`w-full h-9 rounded-lg border text-body font-medium cursor-pointer transition-colors ${form.isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-gray-50/50 text-text-muted'}`}
                  >
                    {form.isActive ? '启用中' : '已禁用'}
                  </button>
                </div>
              </div>
            </div>

            {/* 固定底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '添加轮播'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((slide) => (
          <div key={slide.id} className={`card p-0 overflow-hidden ${!slide.isActive ? 'opacity-50' : ''}`}>
            <div className="aspect-[2.4/1] bg-gray-100 relative">
              <img src={slide.image} alt={slide.alt} className="w-full h-full object-cover" />
              {!slide.isActive && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="tag bg-black/60 text-white">已禁用</span>
                </div>
              )}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <p className="text-body font-medium text-text-title">{slide.alt}</p>
                <p className="text-caption text-text-muted">排序: {slide.sortOrder}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleToggle(slide)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer" title={slide.isActive ? '禁用' : '启用'}>
                  {slide.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => openEdit(slide)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(slide.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="card text-center text-text-muted py-8 col-span-2">暂无轮播图</div>}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除轮播"
        message="确定要删除这张轮播图吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
