'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';

interface UserAvatarUploadProps {
  currentAvatar?: string;
  onSuccess?: () => void;
}

export function UserAvatarUpload({ currentAvatar, onSuccess }: UserAvatarUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '请选择图片文件', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: '图片不能超过 5MB', variant: 'destructive' });
      return;
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // 上传
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/auth/upload-media', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      const json = await res.json();
      if (json.code === 0 || json.code === 200) {
        toast({ title: '头像已更新' });
        onSuccess?.();
      } else {
        toast({ title: '上传失败', description: json.message || '请重试', variant: 'destructive' });
        setPreview(currentAvatar ?? '');
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' });
      setPreview(currentAvatar ?? '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-2 flex-shrink-0">
        {preview ? (
          <img src={preview} alt="头像预览" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
            ?
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '上传中...' : '选择图片'}
        </button>
        <p className="text-xs text-muted-foreground">支持 JPG/PNG，最大 5MB</p>
      </div>
    </div>
  );
}
