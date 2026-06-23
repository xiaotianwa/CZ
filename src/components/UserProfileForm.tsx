'use client';

import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { api } from '@/lib/api';

interface UserProfileFormProps {
  user: {
    id: string;
    name: string;
    bio?: string;
    city?: string;
    province?: string;
  };
  onSuccess?: () => void;
}

export function UserProfileForm({ user, onSuccess }: UserProfileFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? '');
  const [city, setCity] = useState(user.city ?? '');
  const [province, setProvince] = useState(user.province ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: '请输入昵称', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/api/auth/me', { name: name.trim(), bio, city, province });
      if (res.ok) {
        toast({ title: '资料已更新' });
        onSuccess?.();
      } else {
        toast({ title: '更新失败', description: res.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: '网络错误', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">昵称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          maxLength={30}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">个人简介</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          rows={3}
          maxLength={200}
          placeholder="介绍一下自己..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">省份</label>
          <input
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="如：广东"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">城市</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="如：深圳"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
