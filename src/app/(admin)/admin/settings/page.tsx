'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Save, AlertCircle, CheckCircle, Upload, X, Globe, User, Share2, BarChart3, RefreshCw } from 'lucide-react';
import { adminGet, adminPut } from '@/lib/admin-fetch';

interface Field {
  key: string;
  label: string;
  placeholder: string;
  type?: 'image' | 'textarea' | 'tags' | 'toggle';
  half?: boolean;
}

interface SettingsGroup {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: Field[];
}

 interface SiteLogItem {
   id: string;
   path: string;
   ip: string | null;
   ua: string | null;
   referrer: string | null;
   createdAt: string;
 }

 interface SiteLogResponse {
   summary: {
     totalViews: number;
     todayViews: number;
     uniquePaths: number;
     rangeDays: number;
     topPaths: Array<{ path: string; count: number }>;
   };
   list: SiteLogItem[];
   pagination: {
     total: number;
     page: number;
     pageSize: number;
     totalPages: number;
   };
 }

const settingsGroups: SettingsGroup[] = [
  {
    title: '基本设置',
    description: '站点名称、描述等基础信息',
    icon: Globe,
    fields: [
      { key: 'site_name', label: '站点名称', placeholder: '1103社区', half: true },
      { key: 'cos_cdn_domain', label: 'COS CDN 域名', placeholder: 'cdn.example.com', half: true },
      { key: 'site_description', label: '站点描述', placeholder: '陈泽的专属粉丝社区' },
    ],
  },
  {
    title: '主播资料',
    description: '主播个人信息、头像与标签',
    icon: User,
    fields: [
      { key: 'profile_name', label: '主播名称', placeholder: '陈泽', half: true },
      { key: 'profile_english_name', label: '英文名', placeholder: 'ChenZe', half: true },
      { key: 'profile_avatar', label: '头像', placeholder: '', type: 'image' },
      { key: 'profile_intro', label: '主播简介', placeholder: '英雄联盟主播、游戏自媒体创作者...', type: 'textarea' },
      { key: 'profile_birthday', label: '家乡/生日', placeholder: '黑龙江绥棱', half: true },
      { key: 'profile_identity', label: '身份标签', placeholder: '英雄联盟主播', half: true },
      { key: 'profile_birthplace', label: '详细地址', placeholder: '黑龙江省绥化市绥棱县', half: true },
      { key: 'profile_height', label: '身高', placeholder: '未公开', half: true },
      { key: 'profile_tags', label: '标签', placeholder: '输入标签后按回车添加', type: 'tags' },
    ],
  },
  {
    title: '社交平台',
    description: '抖音、微博社交媒体链接与名片信息',
    icon: Share2,
    fields: [
      { key: 'social_douyin', label: '抖音链接', placeholder: 'https://www.douyin.com/user/...', half: true },
      { key: 'social_douyin_followers', label: '抖音粉丝数', placeholder: '2209.6万', half: true },
      { key: 'social_douyin_account_name', label: '抖音账号名', placeholder: '陈泽', half: true },
      { key: 'social_douyin_account_id', label: '抖音号', placeholder: 'chenze1103', half: true },
      { key: 'social_douyin_desc', label: '抖音简介', placeholder: '英雄联盟主播、游戏领域自媒体创作者' },
      { key: 'social_douyin_qrcode', label: '抖音二维码', placeholder: '', type: 'image' },
      { key: 'social_weibo', label: '微博链接', placeholder: 'https://weibo.com/...', half: true },
      { key: 'social_weibo_followers', label: '微博粉丝数', placeholder: '500万+', half: true },
      { key: 'social_weibo_account_name', label: '微博昵称', placeholder: '陈泽ChenZe', half: true },
      { key: 'social_weibo_account_id', label: '微博ID', placeholder: 'chenze_official', half: true },
      { key: 'social_weibo_desc', label: '微博简介', placeholder: '英雄联盟主播 | 动态更新' },
      { key: 'social_weibo_qrcode', label: '微博二维码', placeholder: '', type: 'image' },
    ],
  },
  {
    title: '功能开关',
    description: '控制前台功能入口的显示与访问权限',
    icon: Globe,
    fields: [
      { key: 'feature_community_enabled', label: '启用社区入口', placeholder: '', type: 'toggle' },
    ],
  },
];

function TagsInputField({ value, onChange, label, placeholder }: { value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').filter(Boolean) : [];

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag].join(','));
    }
    setInput('');
  };

  const removeTag = (idx: number) => {
    onChange(tags.filter((_, i) => i !== idx).join(','));
  };

  return (
    <div>
      <label className="text-body font-medium text-text-title mb-1.5 block">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-btn border border-border bg-white min-h-[42px] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        {tags.map((tag, idx) => (
          <span key={tag} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-tag bg-primary-bg text-primary text-caption font-medium">
            {tag}
            <button onClick={() => removeTag(idx)} className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center cursor-pointer" aria-label="删除">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(); }
            if (e.key === 'Backspace' && !input && tags.length) removeTag(tags.length - 1);
          }}
          onBlur={() => { if (input.trim()) addTag(); }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] h-7 bg-transparent text-body outline-none placeholder:text-text-disabled"
        />
      </div>
    </div>
  );
}

function ImageUploadField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'profile');
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: form,
      });
      const json = await res.json();
      if (json.data?.url) {
        onChange(json.data.url);
      } else {
        alert(json.message || '上传失败');
      }
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-body font-medium text-text-title mb-1.5 block">{label}</label>
      <div className="flex items-start gap-4">
        {value ? (
          <div className="relative w-24 h-24 rounded-btn overflow-hidden bg-gray-100 border border-border flex-shrink-0">
            <Image src={value} alt={label} fill className="object-cover" />
            <button
              onClick={() => onChange('')}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer"
              aria-label="移除"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-btn border-2 border-dashed border-border bg-gray-50 flex items-center justify-center text-text-disabled flex-shrink-0">
            <Upload className="w-6 h-6" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-primary h-9 px-4 text-body inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? '上传中...' : '选择图片'}
          </button>
          <p className="text-caption text-text-muted">支持 JPG/PNG/WebP/GIF，最大 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [siteLogs, setSiteLogs] = useState<SiteLogResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logDays, setLogDays] = useState(7);

  useEffect(() => {
    adminGet<Record<string, string>>('/api/admin/settings')
      .then((res) => setSettings({
        ...res.data,
        feature_community_enabled: res.data.feature_community_enabled ?? 'true',
      }))
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  const fetchSiteLogs = async (days: number = logDays) => {
    setLogsLoading(true);
    try {
      const res = await adminGet<SiteLogResponse>(`/api/admin/site-logs?days=${days}&page=1&pageSize=20`);
      setSiteLogs(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '网站日志加载失败' });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteLogs(logDays);
  }, [logDays]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await adminPut('/api/admin/settings', settings);
      setMessage({ type: 'success', text: '保存成功' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 pb-20">
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-btn text-body ${message.type === 'success' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {settingsGroups.map((group) => (
        <div key={group.title} className="card">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-divider">
            <div className="w-8 h-8 rounded-btn bg-primary-bg flex items-center justify-center flex-shrink-0">
              <group.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-title">{group.title}</h3>
              <p className="text-caption text-text-muted">{group.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
            {group.fields.map((field) => (
              <div key={field.key} className={field.half ? '' : 'md:col-span-2'}>
                {field.type === 'tags' ? (
                  <TagsInputField
                    value={settings[field.key] || ''}
                    onChange={(v) => setSettings({ ...settings, [field.key]: v })}
                    label={field.label}
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'image' ? (
                  <ImageUploadField
                    value={settings[field.key] || ''}
                    onChange={(url) => setSettings({ ...settings, [field.key]: url })}
                    label={field.label}
                  />
                ) : field.type === 'toggle' ? (
                  <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="text-body font-medium text-text-title block">{field.label}</label>
                        <p className="text-caption text-text-muted mt-1">关闭后将隐藏前台社区入口，并禁止访问 `/community` 页面。</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings[field.key] !== 'false'}
                        onClick={() => setSettings({
                          ...settings,
                          [field.key]: settings[field.key] === 'false' ? 'true' : 'false',
                        })}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings[field.key] !== 'false' ? 'bg-primary' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings[field.key] !== 'false' ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="text-body font-medium text-text-title mb-1.5 block">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={settings[field.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full p-3 rounded-btn border border-border bg-white text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-disabled"
                      />
                    ) : (
                      <input
                        value={settings[field.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full h-10 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-text-disabled"
                      />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card">
        <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-divider sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-primary-bg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-title">网站日志</h3>
              <p className="text-caption text-text-muted">查看页面访问记录与热门路径统计</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={logDays}
              onChange={(e) => setLogDays(Number(e.target.value))}
              className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary"
            >
              <option value={1}>最近 1 天</option>
              <option value={7}>最近 7 天</option>
              <option value={30}>最近 30 天</option>
            </select>
            <button
              type="button"
              onClick={() => fetchSiteLogs(logDays)}
              disabled={logsLoading}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-btn border border-border bg-white text-body text-text-body hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">统计周期总访问</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.totalViews ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">今日访问</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.todayViews ?? 0}</p>
          </div>
          <div className="rounded-card border border-divider bg-gray-50/70 px-4 py-3">
            <p className="text-caption text-text-muted">访问路径数</p>
            <p className="mt-1 text-[22px] font-semibold text-text-title">{siteLogs?.summary.uniquePaths ?? 0}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-card border border-divider bg-white">
            <div className="border-b border-divider px-4 py-3">
              <h4 className="text-body font-medium text-text-title">热门路径</h4>
            </div>
            <div className="px-4 py-3 space-y-3">
              {(siteLogs?.summary.topPaths ?? []).length > 0 ? (
                siteLogs?.summary.topPaths.map((item) => (
                  <div key={item.path} className="flex items-center justify-between gap-3 text-body">
                    <span className="truncate text-text-body">{item.path}</span>
                    <span className="text-caption font-medium text-text-muted">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-caption text-text-muted">暂无统计数据</p>
              )}
            </div>
          </div>

          <div className="rounded-card border border-divider bg-white overflow-hidden">
            <div className="border-b border-divider px-4 py-3 flex items-center justify-between gap-3">
              <h4 className="text-body font-medium text-text-title">最近访问记录</h4>
              <span className="text-caption text-text-muted">近 {siteLogs?.summary.rangeDays ?? logDays} 天</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="bg-gray-50/60 border-b border-divider">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">路径</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">IP</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">来源</th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-muted">加载中...</td>
                    </tr>
                  )}
                  {!logsLoading && (siteLogs?.list ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-divider last:border-0 align-top">
                      <td className="px-4 py-3 text-text-title">
                        <div className="max-w-[260px] truncate" title={item.path}>{item.path}</div>
                        {item.ua ? <div className="mt-1 max-w-[260px] truncate text-[11px] text-text-muted" title={item.ua}>{item.ua}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{item.ip || '未知'}</td>
                      <td className="px-4 py-3 text-text-muted">
                        <div className="max-w-[220px] truncate" title={item.referrer || ''}>{item.referrer || '直接访问'}</div>
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                  {!logsLoading && (siteLogs?.list ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-muted">暂无日志记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-white border-t border-divider flex items-center justify-between">
        <p className="text-caption text-text-muted">修改后请点击保存</p>
        <button onClick={handleSave} disabled={saving} className="btn-primary h-10 px-6 flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
