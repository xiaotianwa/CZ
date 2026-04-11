'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Upload, Loader2, X, ImageIcon, GripVertical } from 'lucide-react';
import { adminGet, adminPost, adminDelete, adminUpload } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface Photo {
  id: string;
  url: string;
  thumbnail: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}

interface AlbumDetail {
  id: string;
  title: string;
  category: string;
  cover: string;
  sortOrder: number;
  photos: Photo[];
}

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAlbum = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminGet<AlbumDetail>(`/api/admin/albums/${albumId}`);
      setAlbum(res.data);
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  const doUploadFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setToast({ open: true, message: '请选择图片文件', type: 'error' });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of imageFiles) {
      try {
        if (file.size > 10 * 1024 * 1024) {
          failCount++;
          continue;
        }
        const result = await adminUpload(file, 'album');
        await adminPost(`/api/admin/albums/${albumId}/photos`, {
          url: result.url,
          sortOrder: (album?.photos.length ?? 0) + successCount,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setToast({ open: true, message: `成功上传 ${successCount} 张照片${failCount > 0 ? `，${failCount} 张失败` : ''}`, type: 'success' });
      fetchAlbum();
    } else {
      setToast({ open: true, message: '上传失败，请重试', type: 'error' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) doUploadFiles(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) doUploadFiles(files);
  };

  const handleDeletePhoto = async () => {
    const photoId = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/albums/${albumId}/photos?photoId=${photoId}`);
      setToast({ open: true, message: '删除成功', type: 'success' });
      fetchAlbum();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  // 加载骨架屏
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <ImageIcon className="w-12 h-12 mb-3 text-text-disabled" />
        <p className="text-body">相册不存在或已被删除</p>
        <button onClick={() => router.push('/admin/albums')} className="btn-primary h-9 px-4 text-caption mt-4">
          返回相册列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/albums')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-text-muted" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-heading-sm text-text-title">{album.title}</h2>
              <span className="tag-primary text-[10px]">{album.category}</span>
            </div>
            <p className="text-caption text-text-muted mt-0.5">共 {album.photos.length} 张照片</p>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {uploading ? '上传中...' : '添加照片'}
        </button>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 拖拽上传区域 + 照片网格 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative min-h-[300px] rounded-2xl border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-transparent'
        }`}
      >
        {/* 拖拽提示遮罩 */}
        {dragOver && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary/5 rounded-2xl pointer-events-none">
            <Upload className="w-10 h-10 text-primary mb-2" />
            <p className="text-body font-medium text-primary">松开鼠标上传照片</p>
          </div>
        )}

        {album.photos.length === 0 ? (
          /* 空状态 */
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex flex-col items-center justify-center py-20 cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-body text-text-muted">正在上传照片...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7 text-text-disabled" />
                </div>
                <p className="text-body font-medium text-text-body">点击或拖拽照片到此处上传</p>
                <p className="text-caption text-text-muted mt-1">支持 JPG、PNG、WebP 格式，单张最大 10MB，支持批量上传</p>
              </>
            )}
          </div>
        ) : (
          /* 照片网格 */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {album.photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-border/60">
                <img
                  src={photo.url}
                  alt={photo.description || '照片'}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105"
                  onClick={() => setPreviewUrl(photo.url)}
                  loading="lazy"
                />
                {/* 悬浮操作栏 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setConfirmState({ open: true, id: photo.id })}
                      className="p-1.5 rounded-lg bg-white/90 text-danger hover:bg-white cursor-pointer transition-colors"
                      title="删除照片"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 添加更多照片的卡片 */}
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : (
                <>
                  <Plus className="w-6 h-6 text-text-disabled" />
                  <span className="text-caption text-text-muted">添加照片</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 确认删除弹窗 */}
      <ConfirmDialog
        open={confirmState.open}
        title="删除照片"
        message="确定要删除这张照片吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDeletePhoto}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
