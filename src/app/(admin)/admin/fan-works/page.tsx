'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Star, Palette, CheckCircle2, XCircle, Clock, Eye, Play, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
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
  status: string;
  rejectReason: string | null;
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
  image: '绘画/图片', video: '视频',
};

const statusLabel: Record<string, { text: string; cls: string }> = {
  pending: { text: '待审核', cls: 'tag-muted' },
  approved: { text: '已通过', cls: 'bg-green-100 text-green-700' },
  rejected: { text: '已驳回', cls: 'bg-red-100 text-red-700' },
};

export default function AdminFanWorksPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FanWorkItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [imageInput, setImageInput] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string; reason: string }>({ open: false, id: '', reason: '' });
  const [preview, setPreview] = useState<FanWorkItem | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const fetchWorks = useCallback(async () => {
    try {
      const url = statusFilter === 'all' ? '/api/admin/fan-works?pageSize=100' : `/api/admin/fan-works?pageSize=100&status=${statusFilter}`;
      const res = await adminGet<PaginatedResponse>(url);
      setData(res.data);
    } catch (err) { console.error(err); }
  }, [statusFilter]);

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

  const handleReview = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await adminPut('/api/admin/fan-works/review', { id, action, rejectReason: reason });
      setToast({ open: true, message: action === 'approve' ? '已通过' : '已驳回', type: 'success' });
      setRejectDialog({ open: false, id: '', reason: '' });
      fetchWorks();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 件作品</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-white text-caption focus:outline-none focus:border-primary"
          >
            <option value="all">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已驳回</option>
          </select>
        </div>
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-body font-semibold text-text-title">{work.title}</h3>
                <span className="tag-muted text-[10px]">{typeLabel[work.type] || work.type}</span>
                {work.isFeatured && <span className="tag-primary text-[10px]">精选</span>}
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${(statusLabel[work.status] || statusLabel.pending).cls}`}>
                  {work.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                  {work.status === 'approved' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {work.status === 'rejected' && <XCircle className="w-2.5 h-2.5" />}
                  {(statusLabel[work.status] || statusLabel.pending).text}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-caption text-text-muted">
                <span>{work.authorName}</span>
                {work.source && <span>{work.source}</span>}
                {work.status === 'rejected' && work.rejectReason && <span className="text-danger">驳回原因：{work.rejectReason}</span>}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => { setPreview(work); setPreviewIdx(0); }}
                className="p-1.5 rounded-btn text-primary hover:bg-primary/10 cursor-pointer"
                title="预览"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {work.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReview(work.id, 'approve')}
                    className="p-1.5 rounded-btn text-success hover:bg-green-50 cursor-pointer"
                    title="通过"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRejectDialog({ open: true, id: work.id, reason: '' })}
                    className="p-1.5 rounded-btn text-danger hover:bg-red-50 cursor-pointer"
                    title="驳回"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
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

      {/* 预览弹窗 */}
      {preview && (() => {
        let imgs: string[] = [];
        try { imgs = JSON.parse(preview.images || '[]'); } catch { /* */ }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-heading-sm truncate">{preview.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-caption text-text-muted">{preview.authorName}</span>
                      <span className="tag-muted text-[10px]">{typeLabel[preview.type] || preview.type}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${(statusLabel[preview.status] || statusLabel.pending).cls}`}>
                        {(statusLabel[preview.status] || statusLabel.pending).text}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {preview.status === 'pending' && (
                    <>
                      <button
                        onClick={() => { handleReview(preview.id, 'approve'); setPreview(null); }}
                        className="h-7 px-3 rounded-lg bg-green-500 text-white text-caption font-medium hover:bg-green-600 cursor-pointer inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> 通过
                      </button>
                      <button
                        onClick={() => { setPreview(null); setRejectDialog({ open: true, id: preview.id, reason: '' }); }}
                        className="h-7 px-3 rounded-lg bg-danger text-white text-caption font-medium hover:bg-danger/90 cursor-pointer inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> 驳回
                      </button>
                    </>
                  )}
                  <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ml-1">
                    <X className="w-5 h-5 text-text-muted" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {preview.description && (
                  <p className="text-body text-text-body">{preview.description}</p>
                )}
                {/* 视频 */}
                {preview.type === 'video' && preview.contentUrl && (
                  <div className="space-y-2">
                    <h4 className="text-caption font-semibold text-text-title flex items-center gap-1"><Play className="w-3.5 h-3.5" /> 视频</h4>
                    {/\.(mp4|webm|mov)$/i.test(preview.contentUrl) ? (
                      <video src={preview.contentUrl} controls className="w-full rounded-lg max-h-[400px] bg-black" />
                    ) : (
                      <a href={preview.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline text-body">
                        <ExternalLink className="w-4 h-4" /> {preview.contentUrl}
                      </a>
                    )}
                  </div>
                )}
                {/* 图片 */}
                {imgs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-caption font-semibold text-text-title">作品图片（{imgs.length} 张）</h4>
                    <div className="relative">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-border">
                        {/\.(mp4|webm|mov)$/i.test(imgs[previewIdx]) ? (
                          <video src={imgs[previewIdx]} controls className="w-full h-full object-contain bg-black" />
                        ) : (
                          <img src={imgs[previewIdx]} alt={`预览${previewIdx + 1}`} className="w-full h-full object-contain" />
                        )}
                      </div>
                      {imgs.length > 1 && (
                        <>
                          <button
                            onClick={() => setPreviewIdx((prev) => (prev - 1 + imgs.length) % imgs.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setPreviewIdx((prev) => (prev + 1) % imgs.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                    {imgs.length > 1 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {imgs.map((url, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPreviewIdx(idx)}
                            className={`w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${
                              idx === previewIdx ? 'border-primary' : 'border-transparent hover:border-primary/30'
                            }`}
                          >
                            <img src={url} alt={`缩略图${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* 其他信息 */}
                {(preview.source || preview.sourceUrl || (preview.status === 'rejected' && preview.rejectReason)) && (
                  <div className="text-caption text-text-muted space-y-1 pt-2 border-t border-border/40">
                    {preview.source && <p>来源平台：{preview.source}</p>}
                    {preview.sourceUrl && <p>来源链接：<a href={preview.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{preview.sourceUrl}</a></p>}
                    {preview.status === 'rejected' && preview.rejectReason && <p className="text-danger">驳回原因：{preview.rejectReason}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 驳回原因弹窗 */}
      {rejectDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRejectDialog({ open: false, id: '', reason: '' })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-heading-sm flex items-center gap-2"><XCircle className="w-5 h-5 text-danger" /> 驳回作品</h3>
            <textarea
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
              rows={3}
              placeholder="请填写驳回原因（必填）"
              className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectDialog({ open: false, id: '', reason: '' })} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button
                onClick={() => handleReview(rejectDialog.id, 'reject', rejectDialog.reason)}
                disabled={!rejectDialog.reason.trim()}
                className="btn-primary h-9 px-5 text-caption bg-danger hover:bg-danger/90 disabled:opacity-50"
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}

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
