'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Copy, Check, FolderOpen, Play, Music } from 'lucide-react';
import { adminGet, adminDelete, adminUpload } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  category: string;
  createdAt: string;
}

interface PaginatedResponse {
  list: MediaItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function AdminMediaPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const mediaList = data?.list ?? [];
  const totalPages = data?.pagination?.totalPages ?? 0;
  const totalCount = data?.pagination?.total ?? 0;

  const fetchMedia = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '24' });
      if (category) params.set('category', category);
      const res = await adminGet<PaginatedResponse>(`/api/admin/media?${params}`);
      setData(res.data);
    } catch (err) { console.error(err); }
  }, [page, category]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await adminUpload(file, category || 'general');
      }
      fetchMedia();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '上传失败', type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/media?id=${id}`);
    fetchMedia();
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary"
        >
          <option value="">全部分类</option>
          <option value="avatar">头像</option>
          <option value="post">帖子</option>
          <option value="album">相册</option>
          <option value="cover">封面</option>
          <option value="game">游戏</option>
          <option value="event">活动</option>
          <option value="music">音乐</option>
          <option value="general">通用</option>
        </select>

        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/flac,audio/aac"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? '上传中...' : '上传文件'}
          </button>
        </div>
      </div>

      <div className="text-caption text-text-muted">
        共 {totalCount} 个文件 · 存储于腾讯云 COS
      </div>

      {mediaList.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-text-muted">
          <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
          <p>暂无媒体文件</p>
          <p className="text-caption mt-1">点击上方按钮上传图片、视频或音频</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {mediaList.map((media) => (
          <div key={media.id} className="card p-0 overflow-hidden group">
            <div className="aspect-square bg-gray-100 relative">
              {media.mimeType?.startsWith('audio/') ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                  <Music className="w-10 h-10 text-blue-400 mb-2" />
                  <audio src={media.url} controls preload="none" className="w-[90%] h-8" />
                </div>
              ) : media.mimeType?.startsWith('video/') ? (
                <div className="w-full h-full relative">
                  <video src={media.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(media.url)}
                    className="p-2 rounded-full bg-white/90 text-text-body hover:bg-white cursor-pointer"
                    title="复制URL"
                  >
                    {copied === media.url ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(media.id)}
                    className="p-2 rounded-full bg-white/90 text-danger hover:bg-white cursor-pointer"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-2">
              <p className="text-caption text-text-body truncate">{media.filename}</p>
              <p className="text-[10px] text-text-muted">{formatSize(media.size)}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
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
      )}
      <ConfirmDialog
        open={confirmState.open}
        title="删除文件"
        message="确定要删除此媒体文件吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
