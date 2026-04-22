'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Star, Link, XCircle, Gamepad2, Power } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete, adminPatch } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';
import { GAME_CENTER_ICON_OPTIONS, type GameCenterIconKey } from '@/data/gameCenterEntries';

interface GameItem {
  id: string;
  name: string;
  cover: string;
  platform: string;
  genre: string;
  status: string;
  hours: number;
  rating: number;
  comment: string;
  description: string;
  downloadLinks: string;
  lastPlayed: string;
  sortOrder: number;
}

interface PaginatedResponse {
  list: GameItem[];
  pagination: { total: number };
}

interface GameCenterEntryItem {
  id: string;
  entryKey: string;
  title: string;
  href: string;
  subtitle: string;
  desc: string;
  iconKey: GameCenterIconKey;
  gradient: string;
  glowColor: string;
  badge?: string;
  isEnabled: boolean;
  sortOrder: number;
}

const defaultForm = {
  name: '', cover: '', platform: '', genre: '', status: 'playing',
  lastPlayed: '', hours: 0, rating: 5, comment: '', description: '',
  downloadLinks: [] as { label: string; url: string }[], sortOrder: 0,
};

const defaultEntryForm = {
  entryKey: '',
  title: '',
  href: '',
  subtitle: '',
  desc: '',
  iconKey: 'sparkles' as GameCenterIconKey,
  gradient: 'from-violet-600 via-purple-600 to-indigo-700',
  glowColor: 'rgba(124,58,237,0.4)',
  badge: '',
  sortOrder: 0,
  isEnabled: true,
};

export default function AdminGamesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [entries, setEntries] = useState<GameCenterEntryItem[]>([]);
  const [togglingKey, setTogglingKey] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [entryForm, setEntryForm] = useState(defaultEntryForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchGames = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/games?pageSize=50');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await adminGet<GameCenterEntryItem[]>('/api/admin/game-center-entries');
      setEntries(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchGames();
    fetchEntries();
  }, [fetchGames, fetchEntries]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };

  const openCreateEntry = () => {
    setEntryForm({
      ...defaultEntryForm,
      sortOrder: entries.length > 0 ? Math.max(...entries.map((item) => item.sortOrder)) + 1 : 0,
    });
    setShowEntryForm(true);
  };

  const openEdit = (item: GameItem) => {
    let links: { label: string; url: string }[] = [];
    try { links = JSON.parse(item.downloadLinks || '[]'); } catch { /* */ }
    setForm({ ...item, downloadLinks: links, lastPlayed: item.lastPlayed || '' });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await adminPut(`/api/admin/games/${editing.id}`, form);
      } else {
        await adminPost('/api/admin/games', form);
      }
      setShowForm(false);
      fetchGames();
    } catch (err) { setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' }); }
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/games/${id}`);
    fetchGames();
  };

  const handleToggleEntry = async (entry: GameCenterEntryItem) => {
    try {
      setTogglingKey(entry.entryKey);
      const res = await adminPatch<GameCenterEntryItem[]>('/api/admin/game-center-entries', {
        entries: [
          {
            entryKey: entry.entryKey,
            isEnabled: !entry.isEnabled,
            sortOrder: entry.sortOrder,
          },
        ],
      });
      setEntries(res.data);
      setToast({ open: true, message: `${entry.title}${entry.isEnabled ? '已关闭' : '已开放'}`, type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    } finally {
      setTogglingKey('');
    }
  };

  const handleCreateEntry = async () => {
    try {
      setCreatingEntry(true);
      const res = await adminPost<GameCenterEntryItem[]>('/api/admin/game-center-entries', {
        ...entryForm,
        badge: entryForm.badge.trim(),
      });
      setEntries(res.data);
      setShowEntryForm(false);
      setToast({ open: true, message: '游戏入口已添加', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    } finally {
      setCreatingEntry(false);
    }
  };

  const statusLabel: Record<string, string> = { playing: '在玩', recent: '最近', favorite: '最爱' };

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-text-title">游戏大厅入口管理</h3>
              <p className="text-caption text-text-muted">控制 /play 页面各个游戏入口的开放与关闭</p>
            </div>
          </div>
          <button onClick={openCreateEntry} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
            <Plus className="w-4 h-4" /> 新增入口
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.entryKey} className="rounded-2xl border border-border/60 bg-gray-50/60 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-body font-semibold text-text-title">{entry.title}</p>
                  <span className={`tag text-[10px] ${entry.isEnabled ? 'tag-success' : 'tag-muted'}`}>
                    {entry.isEnabled ? '已开放' : '已关闭'}
                  </span>
                </div>
                <p className="text-caption text-text-muted mt-1">{entry.subtitle}</p>
                <p className="text-caption text-text-disabled mt-1 truncate">{entry.href}</p>
              </div>
              <button
                onClick={() => handleToggleEntry(entry)}
                disabled={togglingKey === entry.entryKey}
                className={`h-9 px-4 rounded-full text-caption font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  entry.isEnabled
                    ? 'bg-red-50 text-danger hover:bg-red-100'
                    : 'bg-primary/10 text-primary hover:bg-primary/15'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {togglingKey === entry.entryKey ? '处理中...' : entry.isEnabled ? '关闭入口' : '开放入口'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {showEntryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEntryForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">新增游戏大厅入口</h3>
              </div>
              <button onClick={() => setShowEntryForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">入口标识</label>
                  <input
                    value={entryForm.entryKey}
                    onChange={(e) => setEntryForm({ ...entryForm, entryKey: e.target.value })}
                    placeholder="如 puzzle-run"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">入口名称</label>
                  <input
                    value={entryForm.title}
                    onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                    placeholder="输入展示名称"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">入口链接</label>
                  <input
                    value={entryForm.href}
                    onChange={(e) => setEntryForm({ ...entryForm, href: e.target.value })}
                    placeholder="如 /play/puzzle-run"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">副标题</label>
                  <input
                    value={entryForm.subtitle}
                    onChange={(e) => setEntryForm({ ...entryForm, subtitle: e.target.value })}
                    placeholder="如 PUZZLE RUN"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">入口描述</label>
                <textarea
                  value={entryForm.desc}
                  onChange={(e) => setEntryForm({ ...entryForm, desc: e.target.value })}
                  rows={3}
                  placeholder="简要描述这个游戏入口"
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">图标</label>
                  <select
                    value={entryForm.iconKey}
                    onChange={(e) => setEntryForm({ ...entryForm, iconKey: e.target.value as GameCenterIconKey })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                  >
                    {GAME_CENTER_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">角标</label>
                  <input
                    value={entryForm.badge}
                    onChange={(e) => setEntryForm({ ...entryForm, badge: e.target.value })}
                    placeholder="可选，如 新"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">渐变类名</label>
                  <input
                    value={entryForm.gradient}
                    onChange={(e) => setEntryForm({ ...entryForm, gradient: e.target.value })}
                    placeholder="from-violet-600 via-purple-600 to-indigo-700"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">光晕颜色</label>
                  <input
                    value={entryForm.glowColor}
                    onChange={(e) => setEntryForm({ ...entryForm, glowColor: e.target.value })}
                    placeholder="rgba(124,58,237,0.4)"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">排序</label>
                  <input
                    type="number"
                    min={0}
                    value={entryForm.sortOrder}
                    onChange={(e) => setEntryForm({ ...entryForm, sortOrder: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                  <select
                    value={entryForm.isEnabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setEntryForm({ ...entryForm, isEnabled: e.target.value === 'enabled' })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="enabled">开放</option>
                    <option value="disabled">关闭</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowEntryForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleCreateEntry} disabled={creatingEntry} className="btn-primary h-9 px-5 text-caption disabled:opacity-60 disabled:cursor-not-allowed">{creatingEntry ? '创建中...' : '创建入口'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-body text-text-muted">共 {data?.pagination.total ?? 0} 款游戏</span>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加游戏
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* 固定头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑游戏' : '添加游戏'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"><X className="w-5 h-5 text-text-muted" /></button>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 基本信息 — 双栏：左封面 右表单 */}
              <div className="flex gap-5">
                <div className="w-36 flex-shrink-0">
                  <ImageUpload
                    value={form.cover}
                    onChange={(url) => setForm({ ...form, cover: url })}
                    category="game"
                    label="封面"
                    aspect="aspect-[3/4]"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-caption font-medium text-text-muted mb-1 block">游戏名</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="输入游戏名称"
                      className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">平台</label>
                      <select
                        value={form.platform}
                        onChange={(e) => setForm({ ...form, platform: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">请选择</option>
                        <option value="PC">PC</option>
                        <option value="手游">手游</option>
                        <option value="PC / 手游">PC / 手游</option>
                        <option value="主机">主机</option>
                        <option value="PC / 主机">PC / 主机</option>
                        <option value="全平台">全平台</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">类型</label>
                      <select
                        value={form.genre}
                        onChange={(e) => setForm({ ...form, genre: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="">请选择</option>
                        <option value="MOBA">MOBA</option>
                        <option value="FPS">FPS</option>
                        <option value="RPG">RPG</option>
                        <option value="ARPG">ARPG</option>
                        <option value="MMORPG">MMORPG</option>
                        <option value="策略">策略</option>
                        <option value="卡牌">卡牌</option>
                        <option value="动作冒险">动作冒险</option>
                        <option value="生存建造">生存建造</option>
                        <option value="竞速">竞速</option>
                        <option value="体育">体育</option>
                        <option value="自走棋">自走棋</option>
                        <option value="派对">派对</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors">
                        <option value="playing">在玩</option>
                        <option value="recent">最近</option>
                        <option value="favorite">最爱</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">评分</label>
                      <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">游戏时长（小时）</label>
                      <input type="number" min={0} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="text-caption font-medium text-text-muted mb-1 block">最近游玩</label>
                      <input value={form.lastPlayed} onChange={(e) => setForm({ ...form, lastPlayed: e.target.value })} placeholder="如 2024年7月" className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border/40" />

              {/* 评价区 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-warning" /> 评价信息
                </h4>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">简评</label>
                  <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={2} placeholder="一句话评价这款游戏" className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">详细描述</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="更详细的游戏介绍（可选）" className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border/40" />

              {/* 获取链接区 */}
              <div className="space-y-3">
                <h4 className="text-caption font-semibold text-text-title flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-primary" /> 游戏获取链接
                </h4>
                <div className="space-y-2">
                  {form.downloadLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 group/link">
                      <select
                        value={link.label}
                        onChange={(e) => {
                          const updated = [...form.downloadLinks];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setForm({ ...form, downloadLinks: updated });
                        }}
                        className="w-24 h-9 px-2 rounded-lg border border-border bg-gray-50/50 text-caption focus:outline-none focus:border-primary flex-shrink-0 transition-colors"
                      >
                        <option value="官网">官网</option>
                        <option value="Steam">Steam</option>
                        <option value="Epic">Epic</option>
                        <option value="WeGame">WeGame</option>
                        <option value="非官网">非官网</option>
                        <option value="其他">其他</option>
                      </select>
                      <input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...form.downloadLinks];
                          updated[idx] = { ...updated[idx], url: e.target.value };
                          setForm({ ...form, downloadLinks: updated });
                        }}
                        placeholder="https://..."
                        className="flex-1 h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-caption focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.downloadLinks.filter((_, i) => i !== idx);
                          setForm({ ...form, downloadLinks: updated });
                        }}
                        className="p-1.5 rounded-lg text-text-disabled hover:text-danger hover:bg-red-50 cursor-pointer transition-colors opacity-0 group-hover/link:opacity-100 flex-shrink-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, downloadLinks: [...form.downloadLinks, { label: '官网', url: '' }] })}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-border text-caption text-text-muted hover:border-primary hover:text-primary cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 添加链接
                  </button>
                </div>
              </div>
            </div>

            {/* 固定底部操作栏 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建游戏'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {data?.list.map((game) => (
          <div key={game.id} className="card flex items-center gap-4">
            <div className="w-12 h-16 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
              {game.cover && <img src={game.cover} alt={game.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-text-title">{game.name}</h3>
                <span className={`tag text-[10px] ${game.status === 'playing' ? 'tag-success' : game.status === 'favorite' ? 'tag-primary' : 'tag-muted'}`}>
                  {statusLabel[game.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-caption text-text-muted">
                <span>{game.platform}</span>
                <span>{game.genre}</span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-warning fill-warning" /> {game.rating}
                </span>
                <span>{game.hours}h</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(game)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(game.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除游戏"
        message="确定要删除这款游戏吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}
