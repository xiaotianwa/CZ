'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, ImageIcon } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface AlbumItem {
  id: string;
  title: string;
  category: string;
  cover: string;
  sortOrder: number;
  _count: { photos: number };
}

interface PaginatedResponse {
  list: AlbumItem[];
  pagination: { total: number };
}

const defaultForm = { title: '', category: '', cover: '', sortOrder: 0 };

export default function AdminAlbumsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AlbumItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchAlbums = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/albums?pageSize=50');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };
  const openEdit = (item: AlbumItem) => { setForm({ title: item.title, category: item.category, cover: item.cover, sortOrder: item.sortOrder }); setEditing(item); setShowForm(true); };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminPut(`/api/admin/albums/${editing.id}`, form);
      } else {
        await adminPost('/api/admin/albums', form);
      }
      setShowForm(false);
      fetchAlbums();
    } catch (err) { setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/albums/${id}`);
    fetchAlbums();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 个相册</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 创建相册
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
                  <ImageIcon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑相册' : '创建相册'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">相册标题</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="输入相册名称"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">分类</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="如日常、比赛、活动"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
              <ImageUpload
                value={form.cover}
                onChange={(url) => setForm({ ...form, cover: url })}
                category="album"
                label="相册封面"
              />
            </div>

            {/* 固定底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建相册'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.list.map((album) => (
          <div key={album.id} className="card p-0 overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
              {album.cover ? (
                <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-text-disabled" /></div>
              )}
              <div className="absolute top-2 left-2"><span className="tag-primary text-[10px]">{album.category}</span></div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-semibold text-text-title">{album.title}</h3>
                <span className="text-caption text-text-muted">{album._count.photos} 张</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => openEdit(album)} className="btn-outline h-7 px-3 text-[10px] flex-1">编辑</button>
                <button onClick={() => handleDelete(album.id)} className="h-7 px-3 rounded-btn text-[10px] border border-danger/30 text-danger hover:bg-red-50 cursor-pointer">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除相册"
        message="确定要删除这个相册吗？将同时删除相册内所有照片，此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
