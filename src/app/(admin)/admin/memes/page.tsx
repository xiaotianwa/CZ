'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Hash, Flame } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface MemeItem {
  id: string;
  title: string;
  origin: string;
  description: string;
  example: string | null;
  image: string | null;
  tags: string;
  popularity: number;
  isActive: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: MemeItem[];
  pagination: { total: number };
}

const defaultForm = {
  title: '', origin: '', description: '', example: '',
  image: '', tags: [] as string[], popularity: 0,
  isActive: true, sortOrder: 0,
};

export default function AdminMemesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MemeItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [tagInput, setTagInput] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchMemes = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/memes?pageSize=100');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchMemes(); }, [fetchMemes]);

  const openCreate = () => { setForm(defaultForm); setTagInput(''); setEditing(null); setShowForm(true); };

  const openEdit = (item: MemeItem) => {
    let tags: string[] = [];
    try { tags = JSON.parse(item.tags || '[]'); } catch { /* */ }
    setForm({
      title: item.title,
      origin: item.origin,
      description: item.description,
      example: item.example || '',
      image: item.image || '',
      tags,
      popularity: item.popularity,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setTagInput('');
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminPut('/api/admin/memes', { id: editing.id, ...form });
      } else {
        await adminPost('/api/admin/memes', form);
      }
      setShowForm(false);
      setToast({ open: true, message: editing ? '更新成功' : '创建成功', type: 'success' });
      fetchMemes();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => { setConfirmState({ open: true, id }); };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/memes?id=${id}`);
      setToast({ open: true, message: '删除成功', type: 'success' });
      fetchMemes();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 个梗</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加梗
        </button>
      </div>

      {/* 表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑梗' : '添加梗'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 基本信息 */}
              <div className="flex gap-5">
                <div className="w-36 flex-shrink-0">
                  <ImageUpload
                    value={form.image}
                    onChange={(url) => setForm({ ...form, image: url })}
                    category="general"
                    label="配图（可选）"
                    aspect="aspect-square"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">梗名</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="例：六六六"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">热度</label>
                      <input
                        type="number"
                        min={0}
                        value={form.popularity}
                        onChange={(e) => setForm({ ...form, popularity: Number(e.target.value) })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
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
                  <div className="flex items-center gap-2">
                    <label className="text-caption font-medium text-text-muted">状态</label>
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

              {/* 内容区 */}
              <div className="space-y-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">出处/起源</label>
                  <textarea
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    rows={2}
                    placeholder="这个梗是怎么来的？"
                    className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">详细释义</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="这个梗是什么意思？"
                    className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">用法示例（可选）</label>
                  <textarea
                    value={form.example}
                    onChange={(e) => setForm({ ...form, example: e.target.value })}
                    rows={2}
                    placeholder="怎么用这个梗？"
                    className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 标签 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" /> 标签
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-caption px-2 py-0.5 rounded-full">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-danger cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="输入标签，按回车添加"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                  <button onClick={addTag} className="btn-outline h-9 px-3 text-caption">添加</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建梗'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="grid gap-3">
        {data?.list.map((meme) => {
          let tags: string[] = [];
          try { tags = JSON.parse(meme.tags || '[]'); } catch { /* */ }
          return (
            <div key={meme.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-body font-semibold text-text-title">{meme.title}</h3>
                  {!meme.isActive && <span className="tag-muted text-[10px]">已隐藏</span>}
                  {meme.popularity > 50 && <span className="tag-primary text-[10px]">热梗</span>}
                </div>
                <p className="text-caption text-text-muted line-clamp-1 mt-0.5">{meme.origin}</p>
                {tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-text-muted bg-gray-100 rounded px-1 py-0.5">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(meme)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(meme.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除梗"
        message="确定要删除这个梗吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
