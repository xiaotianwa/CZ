'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Globe, Save, Share2, ToggleRight, User } from 'lucide-react';
import { adminGet, adminPut } from '@/lib/admin-fetch';

interface Field {
  key: string;
  label: string;
  placeholder: string;
  type?: 'textarea' | 'toggle';
  description?: string;
}

interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: Field[];
}

const settingsGroups: SettingsGroup[] = [
  {
    id: 'basic',
    title: '基本设置',
    description: '站点名称、描述等基础信息',
    icon: Globe,
    fields: [
      { key: 'site_name', label: '站点名称', placeholder: '1103' },
      { key: 'site_description', label: '站点描述', placeholder: '1103 陈泽资料与游戏内容站', type: 'textarea' },
      { key: 'cos_cdn_domain', label: 'COS CDN 域名', placeholder: 'cdn.example.com' },
    ],
  },
  {
    id: 'profile',
    title: '主播资料',
    description: '个人信息与首页展示文案',
    icon: User,
    fields: [
      { key: 'profile_name', label: '主播名称', placeholder: '陈泽' },
      { key: 'profile_english_name', label: '英文名', placeholder: 'ChenZe' },
      { key: 'profile_avatar', label: '头像 URL', placeholder: 'https://...' },
      { key: 'profile_intro', label: '主播简介', placeholder: '直播、游戏与个人资料聚合页。', type: 'textarea' },
      { key: 'profile_tags', label: '标签', placeholder: '用英文逗号分隔' },
    ],
  },
  {
    id: 'social',
    title: '社交平台',
    description: '抖音、微博链接与名片信息',
    icon: Share2,
    fields: [
      { key: 'social_douyin', label: '抖音链接', placeholder: 'https://www.douyin.com/user/...' },
      { key: 'social_douyin_followers', label: '抖音粉丝数', placeholder: '2209.6万' },
      { key: 'social_weibo', label: '微博链接', placeholder: 'https://weibo.com/...' },
      { key: 'social_weibo_followers', label: '微博粉丝数', placeholder: '500万' },
    ],
  },
  {
    id: 'features',
    title: '功能开关',
    description: '仅保留当前仍在线的前台入口开关',
    icon: ToggleRight,
    fields: [
      { key: 'feature_memes_enabled', label: '梗百科入口', placeholder: '', type: 'toggle', description: '控制前台发现菜单与页脚中的梗百科入口' },
      { key: 'feature_play_enabled', label: '游戏中心入口', placeholder: '', type: 'toggle', description: '控制导航与移动端底部的游戏中心入口' },
    ],
  },
];

const TOGGLE_DEFAULTS: Record<string, string> = {
  feature_memes_enabled: 'true',
  feature_play_enabled: 'true',
};

function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="rounded-card border border-divider bg-white px-4 py-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <label className="text-body font-medium text-text-title block">{label}</label>
          {description && <p className="text-caption text-text-muted mt-1 leading-relaxed">{description}</p>}
        </div>
        <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300'}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminGet<Record<string, string>>('/api/admin/settings')
      .then((res) => {
        const merged = { ...TOGGLE_DEFAULTS, ...res.data };
        setSettings(merged);
        setInitial(merged);
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  const isDirty = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(settings), ...Object.keys(initial)]));
    return keys.some((k) => (settings[k] ?? '') !== (initial[k] ?? ''));
  }, [settings, initial]);

  const setField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminPut('/api/admin/settings', settings);
      setInitial(settings);
      setMessage({ type: 'success', text: '保存成功' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 space-y-6">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-btn text-body ${message.type === 'success' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {settingsGroups.map((group) => (
        <section key={group.id} className="card">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-divider">
            <div className="w-8 h-8 rounded-btn bg-primary-bg flex items-center justify-center flex-shrink-0">
              <group.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-title">{group.title}</h3>
              <p className="text-caption text-text-muted">{group.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                {field.type === 'toggle' ? (
                  <ToggleField label={field.label} description={field.description} checked={settings[field.key] === 'true'} onChange={(next) => setField(field.key, next ? 'true' : 'false')} />
                ) : (
                  <>
                    <label className="text-body font-medium text-text-title mb-1.5 block">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea value={settings[field.key] || ''} onChange={(e) => setField(field.key, e.target.value)} placeholder={field.placeholder} rows={3} className="w-full p-3 rounded-btn border border-border bg-white text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-disabled" />
                    ) : (
                      <input value={settings[field.key] || ''} onChange={(e) => setField(field.key, e.target.value)} placeholder={field.placeholder} className="w-full h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-disabled" />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,0px)] z-30 bg-white/95 backdrop-blur border-t border-divider">
        <div className="max-w-full px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <p className="text-caption text-text-muted">{isDirty ? '有未保存的更改' : '所有更改已保存'}</p>
          <button onClick={handleSave} disabled={saving || !isDirty} className="btn-primary h-10 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
