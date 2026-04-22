'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Gamepad2, Power } from 'lucide-react';
import { GAME_CENTER_ICON_OPTIONS, type GameCenterIconKey } from '@/data/gameCenterEntries';
import Toast from '@/components/admin/Toast';
import { tcgAdminGet, tcgAdminPatch, tcgAdminPost } from '@/lib/tcg/admin-fetch';

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

export default function GameCenterEntryManager() {
  const [entries, setEntries] = useState<GameCenterEntryItem[]>([]);
  const [togglingKey, setTogglingKey] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [entryForm, setEntryForm] = useState(defaultEntryForm);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });

  const fetchEntries = useCallback(async () => {
    try {
      const res = await tcgAdminGet<GameCenterEntryItem[]>('/api/tcg/admin/game-center-entries');
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openCreateEntry = () => {
    setEntryForm({
      ...defaultEntryForm,
      sortOrder: entries.length > 0 ? Math.max(...entries.map((item) => item.sortOrder)) + 1 : 0,
    });
    setShowEntryForm(true);
  };

  const handleToggleEntry = async (entry: GameCenterEntryItem) => {
    try {
      setTogglingKey(entry.entryKey);
      const res = await tcgAdminPatch<GameCenterEntryItem[]>('/api/tcg/admin/game-center-entries', {
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
      const res = await tcgAdminPost<GameCenterEntryItem[]>('/api/tcg/admin/game-center-entries', {
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

  const primaryBtnStyle = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
  } as const;
  const inputCls = 'w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50';
  const labelCls = 'text-xs font-medium text-white/60 mb-1 block';

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[#141432]/60 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-[#A78BFA]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">游戏大厅入口管理</h3>
              <p className="text-sm text-white/50">控制 /play 页面各个游戏入口的开放与关闭</p>
            </div>
          </div>
          <button onClick={openCreateEntry} className="h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer" style={primaryBtnStyle}>
            <Plus className="w-4 h-4" /> 新增入口
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.entryKey} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{entry.title}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${entry.isEnabled ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
                    {entry.isEnabled ? '已开放' : '已关闭'}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1">{entry.subtitle}</p>
                <p className="text-xs text-white/35 mt-1 truncate font-mono">{entry.href}</p>
              </div>
              <button
                onClick={() => handleToggleEntry(entry)}
                disabled={togglingKey === entry.entryKey}
                className={`h-9 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap ${
                  entry.isEnabled
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                    : 'border-[#7C3AED]/30 bg-[#7C3AED]/15 text-[#A78BFA] hover:bg-[#7C3AED]/25'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                {togglingKey === entry.entryKey ? '处理中...' : entry.isEnabled ? '关闭入口' : '开放入口'}
              </button>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="col-span-full py-10 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
              <Gamepad2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/50">暂无游戏大厅入口</p>
            </div>
          )}
        </div>
      </div>

      {showEntryForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEntryForm(false)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#141432] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <h3 className="text-base font-semibold text-white">新增游戏大厅入口</h3>
              </div>
              <button onClick={() => setShowEntryForm(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><X className="w-5 h-5 text-white/60" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>入口标识</label>
                  <input value={entryForm.entryKey} onChange={(e) => setEntryForm({ ...entryForm, entryKey: e.target.value })} placeholder="如 puzzle-run" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>入口名称</label>
                  <input value={entryForm.title} onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })} placeholder="输入展示名称" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>入口链接</label>
                  <input value={entryForm.href} onChange={(e) => setEntryForm({ ...entryForm, href: e.target.value })} placeholder="如 /play/puzzle-run" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>副标题</label>
                  <input value={entryForm.subtitle} onChange={(e) => setEntryForm({ ...entryForm, subtitle: e.target.value })} placeholder="如 PUZZLE RUN" className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>入口描述</label>
                <textarea value={entryForm.desc} onChange={(e) => setEntryForm({ ...entryForm, desc: e.target.value })} rows={3} placeholder="简要描述这个游戏入口" className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#A78BFA]/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>图标</label>
                  <select value={entryForm.iconKey} onChange={(e) => setEntryForm({ ...entryForm, iconKey: e.target.value as GameCenterIconKey })} className={inputCls}>
                    {GAME_CENTER_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>角标</label>
                  <input value={entryForm.badge} onChange={(e) => setEntryForm({ ...entryForm, badge: e.target.value })} placeholder="可选，如 新" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>渐变类名</label>
                  <input value={entryForm.gradient} onChange={(e) => setEntryForm({ ...entryForm, gradient: e.target.value })} placeholder="from-violet-600 via-purple-600 to-indigo-700" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>光晕颜色</label>
                  <input value={entryForm.glowColor} onChange={(e) => setEntryForm({ ...entryForm, glowColor: e.target.value })} placeholder="rgba(124,58,237,0.4)" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>排序</label>
                  <input type="number" min={0} value={entryForm.sortOrder} onChange={(e) => setEntryForm({ ...entryForm, sortOrder: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>状态</label>
                  <select value={entryForm.isEnabled ? 'enabled' : 'disabled'} onChange={(e) => setEntryForm({ ...entryForm, isEnabled: e.target.value === 'enabled' })} className={inputCls}>
                    <option value="enabled">开放</option>
                    <option value="disabled">关闭</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 bg-black/20">
              <button onClick={() => setShowEntryForm(false)} className="h-9 px-5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm cursor-pointer transition-colors">取消</button>
              <button onClick={handleCreateEntry} disabled={creatingEntry} className="h-9 px-5 rounded-lg text-white text-sm font-medium cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed" style={primaryBtnStyle}>{creatingEntry ? '创建中...' : '创建入口'}</button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </>
  );
}
