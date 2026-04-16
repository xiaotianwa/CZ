'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Star, Palette } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface FanWorkItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  cover: string;
  contentUrl: string | null;
  images: string;
  authorName: string;
  authorAvatar: string | null;
  source: string | null;
  sourceUrl: string | null;
  likes: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: FanWorkItem[];
  pagination: { total: number };
}

const defaultForm = {
  title: '', description: '', type: 'image' as string,
  cover: '', contentUrl: '', images: [] as string[],
  authorName: '', authorAvatar: '', source: '', sourceUrl: '',
  likes: 0, isActive: true, isFeatured: false, sortOrder: 0,
};

const typeLabel: Record<string, string> = {
  image: '绘画/图片', video: '视频', audio: '音频', text: '文字', other: '其他',
};

export default function AdminFanWorksPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FanWorkItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [imageInput, setImageInput] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchWorks = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/fan-works?pageSize=100');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchWorks(); }, [fetchWorks]);

  const openCreate = () => { setForm(defaultForm); setImageInput(''); setEditing(null); setShowForm(true); };

  const openEdit = (item: FanWorkItem) => {
    let images: string[] = [];
    try { images = JSON.parse(item.images || '[]'); } catch { /* */ }
    setForm({
      title: item.title,
      description: item.description || '',
      type: item.type,
      cover: item.cover,
      contentUrl: item.contentUrl || '',
      images,
      authorName: item.authorName,
      authorAvatar: item.authorAvatar || '',
      source: item.source || '',
      sourceUrl: item.sourceUrl || '',
      likes: item.likes,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
    });
    setImageInput('');
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminPut('/api/admin/fan-works', { id: editing.id, ...form });
      } else {
        await adminPost('/api/admin/fan-works', form);
      }
      setShowForm(false);
      setToast({ open: true, message: editing ? '更新成功' : '创建成功', type: 'success' });
      fetchWorks();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => { setConfirmState({ open: true, id }); };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/fan-works?id=${id}`);
      setToast({ open: true, message: '删除成功', type: 'success' });
      fetchWorks();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (url && !form.images.includes(url)) {
      setForm({ ...form, images: [...form.images, url] });
    }
    setImageInput('');
  };

  const removeImage = (url: string) => {
    setForm({ ...form, images: form.images.filter((i) => i !== url) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 件作品</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加作品
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
                <h3 className="text-heading-sm">{editing ? '编辑作品' : '添加作品'}</h3>
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
                    value={form.cover}
                    onChange={(url) => setForm({ ...form, cover: url })}
                    category="general"
                    label="封面"
                    aspect="aspect-[4/3]"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">标题</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="作品标题"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">类型</label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="image">绘画/图片</option>
                        <option value="video">视频</option>
                        <option value="audio">音频</option>
                        <option value="text">文字</option>
                        <option value="other">其他</option>
                      </select>
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
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                      <span className="text-caption text-text-body">显示</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                      <span className="text-caption text-text-body">精选推荐</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 作者信息 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title">作者信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">作者名</label>
                    <input
                      value={form.authorName}
                      onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                      placeholder="作者昵称"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">来源平台</label>
                    <input
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      placeholder="B站/微博/抖音等"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">来源链接</label>
                  <input
                    value={form.sourceUrl}
                    onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 内容 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title">作品内容</h4>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">描述（可选）</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    placeholder="作品描述"
                    className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">内容链接（视频/音频链接）</label>
                  <input
                    value={form.contentUrl}
                    onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 多图管理 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title">作品图片（多图）</h4>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-border">
                        <img src={url} alt={`图片${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
                    placeholder="输入图片URL，按回车添加"
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                  <button onClick={addImage} className="btn-outline h-9 px-3 text-caption">添加</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建作品'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="grid gap-3">
        {data?.list.map((work) => (
          <div key={work.id} className="card flex items-center gap-4">
            <div className="w-12 h-16 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
              {work.cover && <img src={work.cover} alt={work.title} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-text-title">{work.title}</h3>
                <span className="tag-muted text-[10px]">{typeLabel[work.type] || work.type}</span>
                {work.isFeatured && <span className="tag-primary text-[10px]">精选</span>}
                {!work.isActive && <span className="tag-muted text-[10px]">已隐藏</span>}
              </div>
              <div className="flex items-center gap-3 mt-1 text-caption text-text-muted">
                <span>{work.authorName}</span>
                {work.source && <span>{work.source}</span>}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(work)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(work.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除作品"
        message="确定要删除这件作品吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
