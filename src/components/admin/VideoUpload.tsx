'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Link, Film } from 'lucide-react';
import { adminUpload } from '@/lib/admin-fetch';

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  category?: string;
  label?: string;
}

type Mode = 'link' | 'upload';

export default function VideoUpload({
  value,
  onChange,
  category = 'general',
  label = '视频（可选）',
}: VideoUploadProps) {
  const [mode, setMode] = useState<Mode>('link');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('请选择视频文件（MP4、WebM、MOV）');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('视频大小不能超过 100MB');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(`正在上传 ${(file.size / 1024 / 1024).toFixed(1)}MB...`);
    try {
      const result = await adminUpload(file, category);
      onChange(result.url);
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setProgress('');
    } finally {
      setUploading(false);
    }
  }, [category, onChange]);

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

  const hasValue = !!value;
  const isVideoFile = hasValue && !value.match(/^https?:\/\/(www\.)?(youtube|youtu\.be|bilibili|douyin)/i);

  return (
    <div>
      <label className="text-caption font-medium text-text-muted mb-1.5 block">{label}</label>

      {/* 已有值时显示预览 */}
      {hasValue ? (
        <div className="relative rounded-lg border border-border bg-gray-50 overflow-hidden">
          {isVideoFile && value.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
            <video
              src={value}
              controls
              className="w-full max-h-48 object-contain bg-black"
              preload="metadata"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Film className="w-4 h-4 text-primary flex-shrink-0" />
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption text-primary hover:underline truncate flex-1"
              >
                {value}
              </a>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 模式切换 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => { setMode('link'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-caption font-medium transition-colors cursor-pointer ${
                mode === 'link' ? 'bg-white text-text-title shadow-sm' : 'text-text-muted hover:text-text-body'
              }`}
            >
              <Link className="w-3 h-3" /> 粘贴链接
            </button>
            <button
              type="button"
              onClick={() => { setMode('upload'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-caption font-medium transition-colors cursor-pointer ${
                mode === 'upload' ? 'bg-white text-text-title shadow-sm' : 'text-text-muted hover:text-text-body'
              }`}
            >
              <Upload className="w-3 h-3" /> 上传视频
            </button>
          </div>

          {/* 链接输入 */}
          {mode === 'link' && (
            <input
              type="url"
              placeholder="视频链接，如 https://..."
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) onChange(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) onChange(v);
                }
              }}
              className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
            />
          )}

          {/* 上传区域 */}
          {mode === 'upload' && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`aspect-video rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                  dragOver
                    ? 'border-primary bg-primary-bg'
                    : 'border-border hover:border-primary/50 hover:bg-gray-50'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-caption text-text-muted">{progress || '上传中...'}</span>
                  </>
                ) : (
                  <>
                    <Film className="w-6 h-6 text-text-muted" />
                    <span className="text-caption text-text-muted">点击或拖拽视频到此处</span>
                    <span className="text-[10px] text-text-disabled">支持 MP4、WebM、MOV，最大 100MB</span>
                  </>
                )}
              </div>
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
