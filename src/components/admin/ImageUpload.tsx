'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { adminUpload } from '@/lib/admin-fetch';

interface UploadResult {
  url: string;
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  category?: string;
  label?: string;
  aspect?: string;
  uploader?: (file: File, category: string) => Promise<UploadResult>;
}

export default function ImageUpload({
  value,
  onChange,
  category = 'general',
  label = '上传图片',
  aspect = 'aspect-video',
  uploader = adminUpload,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const result = await uploader(file, category);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [category, onChange, uploader]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  return (
    <div>
      <label className="text-body font-medium text-text-title mb-1.5 block">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className={`relative ${aspect} rounded-btn overflow-hidden border border-border bg-gray-50 group`}>
          <img src={value} alt="预览" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 h-8 rounded-btn bg-white/90 text-body font-medium text-text-body hover:bg-white cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> 更换
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-btn bg-white/90 text-danger hover:bg-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`${aspect} rounded-btn border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer ${
            dragOver
              ? 'border-primary bg-primary-bg'
              : 'border-border hover:border-primary/50 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-caption text-text-muted">上传中...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-text-muted" />
              <span className="text-caption text-text-muted">点击或拖拽图片到此处</span>
              <span className="text-[10px] text-text-disabled">支持 JPG、PNG、WebP，最大 10MB</span>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-caption text-danger mt-1">{error}</p>
      )}
    </div>
  );
}
