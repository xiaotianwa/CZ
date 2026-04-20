'use client';

/**
 * 卡牌图上传器
 *
 * 交互：
 *   - 空态：虚线拖拽区 / 点击选文件
 *   - 上传中：进度提示 + 禁用
 *   - 上传成功：大图预览（卡牌比例 3:4）+ 文件名 + 尺寸 + "更换" / "移除"
 *   - 错误：红色文案，不破坏已有值
 *
 * 兼容：
 *   - 编辑已有卡时，value 可能是 `/cards/xxx.png`（老数据）或 `https://xxx.cos.xxx.com/...`（新数据）
 *   - 展开"高级"可手输 URL（老数据回收 / 紧急场景）
 *
 * 依赖：POST /api/tcg/admin/upload（multipart/form-data）
 */

import { useCallback, useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Link2 } from 'lucide-react';

export interface ImageUploaderProps {
  value: string | null;
  onChange: (next: string | null) => void;
  /** 缺省时：点击区域的 placeholder 提示词 */
  placeholder?: string;
}

export default function ImageUploader({ value, onChange, placeholder }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [meta, setMeta] = useState<{ filename?: string; size?: number }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    async (file: File) => {
      setError('');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('仅支持 JPG / PNG / WebP');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('图片大小不能超过 8MB');
        return;
      }

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/tcg/admin/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: fd,
        });
        const json = await res.json();
        if (json.code !== 0) {
          setError(json.message || '上传失败');
          return;
        }
        onChange(json.data.url);
        setMeta({ filename: json.data.filename, size: json.data.size });
      } catch {
        setError('网络错误');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) doUpload(f);
    e.target.value = ''; // 清空以便下次选同一文件仍触发
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) doUpload(f);
  };

  const clear = () => {
    if (uploading) return;
    onChange(null);
    setMeta({});
    setError('');
  };

  const hasImage = Boolean(value);

  return (
    <div className="space-y-3">
      {/* 有图预览 */}
      {hasImage ? (
        <div className="flex gap-4">
          <div className="relative group w-40 flex-shrink-0">
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-[0_4px_20px_-6px_rgba(124,58,237,0.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={encodeURI(value!)}
                alt="卡牌预览"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            </div>
            {/* hover 覆盖层 */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="h-8 px-3 rounded-md text-xs bg-white/15 hover:bg-white/25 text-white flex items-center gap-1.5"
                title="更换图片"
              >
                <RefreshCw className="w-3 h-3" /> 更换
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={uploading}
                className="h-8 w-8 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 flex items-center justify-center"
                title="移除"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-[#0f0f23]/80 rounded-lg flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-[#A78BFA] animate-spin" />
                <span className="text-[11px] text-white/70">上传中...</span>
              </div>
            )}
          </div>

          {/* 右侧元信息 */}
          <div className="flex-1 min-w-0 text-sm space-y-1.5 pt-1">
            <div className="text-white/85 font-medium truncate" title={meta.filename}>
              {meta.filename || value!.split('/').pop() || '卡牌图'}
            </div>
            {meta.size !== undefined && (
              <div className="text-[11px] text-white/50">
                {formatBytes(meta.size)}
              </div>
            )}
            <div className="text-[11px] text-white/40 truncate font-mono" title={value!}>
              {value!.length > 60 ? `${value!.slice(0, 28)}...${value!.slice(-24)}` : value}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="h-7 px-2.5 rounded-md text-[11px] bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> 更换
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={uploading}
                className="h-7 px-2.5 rounded-md text-[11px] bg-white/5 border border-white/10 text-white/50 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 移除
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 空态：拖拽上传区
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative rounded-lg border-2 border-dashed transition-all cursor-pointer px-6 py-10 flex flex-col items-center gap-2 ${
            uploading
              ? 'border-[#7C3AED]/40 bg-[#7C3AED]/5 cursor-wait'
              : dragOver
                ? 'border-[#7C3AED]/70 bg-[#7C3AED]/10'
                : 'border-white/15 bg-white/[0.02] hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/[0.04]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-7 h-7 text-[#A78BFA] animate-spin" />
              <div className="text-sm text-white/70">正在上传...</div>
              <div className="text-[11px] text-white/40">请勿关闭页面</div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-[#7C3AED]/15 flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div className="text-sm text-white/80">
                <span className="text-[#A78BFA] font-medium">点击选择</span>
                <span className="text-white/50"> 或拖入图片</span>
              </div>
              <div className="text-[11px] text-white/40">
                {placeholder || 'JPG / PNG / WebP · 建议尺寸 300×420 · 最大 8MB'}
              </div>
            </>
          )}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* 隐藏的 input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileInput}
        className="hidden"
        disabled={uploading}
      />

      {/* 高级：手输 URL */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setAdvancedOpen((x) => !x)}
          className="text-[11px] text-white/45 hover:text-[#A78BFA] flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" /> {advancedOpen ? '收起' : '手动输入 URL（高级）'}
        </button>
        {advancedOpen && (
          <div className="mt-2 space-y-1.5">
            <input
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value || null)}
              placeholder="https://cdn.xxx.com/cards/xxx.webp 或 /cards/xxx.png"
              className="input-tcg !text-xs"
            />
            <p className="tcg-hint">
              兼容老数据：本地路径 <span className="font-mono">/cards/*.png</span> 或完整 URL。若带 CDN 域名与 <span className="font-mono">NEXT_PUBLIC_CARDS_CDN</span> 匹配，前端自动转 webp。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------- helpers --------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
