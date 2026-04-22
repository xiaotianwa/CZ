'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, X, Smile, CheckCircle, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import { tcgAdminDelete, tcgAdminGet, tcgAdminPost, tcgAdminPut } from '@/lib/tcg/admin-fetch';

interface EmojiPuzzleItem {
  id: string;
  emoji: string;
  answer: string;
  hints: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: EmojiPuzzleItem[];
  pagination: { total: number };
}

const defaultForm = {
  emoji: '',
  answer: '',
  hints: ['', '', ''] as string[],
  category: '日常',
  isActive: true,
  sortOrder: 0,
};

export default function EmojiPuzzleManager() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EmojiPuzzleItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const list = data?.list ?? [];

  const fetchData = useCallback(async () => {
    try {
      const res = await tcgAdminGet<PaginatedResponse>('/api/tcg/admin/game-emoji-puzzles?pageSize=100');
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: EmojiPuzzleItem) => {
    let hints: string[] = [];
    try { hints = JSON.parse(item.hints || '[]') as string[]; } catch { hints = []; }
    while (hints.length < 1) hints.push('');
    setForm({ emoji: item.emoji, answer: item.answer, hints, category: item.category, isActive: item.isActive, sortOrder: item.sortOrder });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const cleanHints = form.hints.filter((h) => h.trim() !== '');
    if (!form.emoji.trim()) { setToast({ open: true, message: 'emoji 不能为空', type: 'error' }); return; }
    if (!form.answer.trim()) { setToast({ open: true, message: '答案不能为空', type: 'error' }); return; }
    if (cleanHints.length < 1) { setToast({ open: true, message: '至少需要1个提示', type: 'error' }); return; }

    try {
      const payload = { ...form, hints: cleanHints };
      if (editing) {
        await tcgAdminPut(`/api/tcg/admin/game-emoji-puzzles/${editing.id}`, payload);
      } else {
        await tcgAdminPost('/api/tcg/admin/game-emoji-puzzles', payload);
      }
      setShowForm(false);
      fetchData();
      setToast({ open: true, message: editing ? '题目已更新' : '题目已创建', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const doDelete = async () => {
    try {
      const id = confirmState.id;
      setConfirmState({ open: false, id: '' });
      await tcgAdminDelete(`/api/tcg/admin/game-emoji-puzzles/${id}`);
      fetchData();
      setToast({ open: true, message: '题目已删除', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const handleToggleActive = async (item: EmojiPuzzleItem) => {
    try {
      await tcgAdminPut(`/api/tcg/admin/game-emoji-puzzles/${item.id}`, { isActive: !item.isActive });
      fetchData();
      setToast({ open: true, message: item.isActive ? '题目已停用' : '题目已启用', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const updateHint = (index: number, value: string) => {
    const next = [...form.hints];
    next[index] = value;
    setForm({ ...form, hints: next });
  };

  const addHint = () => {
    if (form.hints.length >= 5) return;
    setForm({ ...form, hints: [...form.hints, ''] });
  };

  const removeHint = (index: number) => {
    if (form.hints.length <= 1) return;
    setForm({ ...form, hints: form.hints.filter((_, i) => i !== index) });
  };

  const activeCount = list.filter((item) => item.isActive).length;

  const primaryBtnStyle = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
  } as const;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>表情猜猜猜题库</h2>
            <p className="text-sm text-white/50 mt-0.5">管理 /play/emoji-guess 使用的表情题目，支持增删改查和启停。</p>
          </div>
          <button onClick={openCreate} className="h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer" style={primaryBtnStyle}>
            <Plus className="w-4 h-4" /> 添加题目
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/60">
          <span>共 {data?.pagination.total ?? 0} 道题目</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{activeCount} 道启用中</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141432]/30 divide-y divide-white/5 overflow-hidden">
          {list.map((item) => {
            let hints: string[] = [];
            try { hints = JSON.parse(item.hints || '[]') as string[]; } catch { hints = []; }
            return (
              <div key={item.id} className={`flex items-start gap-3 px-4 py-3 transition-opacity ${!item.isActive ? 'opacity-50' : ''}`}>
                <div className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-white">答案：{item.answer}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${item.isActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>{item.isActive ? '启用' : '停用'}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">{item.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {hints.map((hint, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-white/5 text-white/60 border border-white/10">💡 {hint}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleActive(item)} className={`p-1.5 rounded cursor-pointer transition-colors ${item.isActive ? 'text-emerald-300 hover:bg-emerald-500/10' : 'text-white/40 hover:bg-white/5'}`} title={item.isActive ? '点击停用' : '点击启用'}>
                    {item.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded text-white/60 hover:text-[#A78BFA] hover:bg-white/5 cursor-pointer transition-colors" title="编辑"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setConfirmState({ open: true, id: item.id })} className="p-1.5 rounded text-white/50 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="py-12 text-center">
              <Smile className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50">暂无表情题目</p>
              <p className="text-xs text-white/40 mt-1">点击&ldquo;添加题目&rdquo;开始配置表情猜猜猜题库</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#141432] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center"><Smile className="w-4 h-4 text-[#A78BFA]" /></div>
                <h3 className="text-base font-semibold text-white">{editing ? '编辑题目' : '添加题目'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><X className="w-5 h-5 text-white/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">表情组合</label>
                  <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🎮🎙️📺" className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">正确答案</label>
                  <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="直播" className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60 mb-2 block">提示词</label>
                <div className="space-y-2">
                  {form.hints.map((hint, index) => (
                    <div key={index} className="flex items-center gap-2 group/hint">
                      <input value={hint} onChange={(e) => updateHint(index, e.target.value)} placeholder={`提示 ${index + 1}`} className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                      {form.hints.length > 1 && (
                        <button type="button" onClick={() => removeHint(index)} className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-0 group-hover/hint:opacity-100 flex-shrink-0"><XCircle className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  {form.hints.length < 5 && (
                    <button type="button" onClick={addHint} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-white/15 text-xs text-white/60 hover:border-[#A78BFA]/50 hover:text-[#A78BFA] cursor-pointer transition-colors"><Plus className="w-3.5 h-3.5" /> 添加提示</button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">分类</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="日常" className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">排序</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">状态</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })} className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50">
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10 bg-black/20">
              <button onClick={() => setShowForm(false)} className="h-9 px-5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm cursor-pointer transition-colors">取消</button>
              <button onClick={handleSubmit} className="h-9 px-5 rounded-lg text-white text-sm font-medium transition-all cursor-pointer" style={primaryBtnStyle}>{editing ? '保存修改' : '创建题目'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmState.open} title="删除题目" message="确定要删除这道表情题目吗？此操作不可撤销。" confirmText="删除" variant="danger" onConfirm={doDelete} onCancel={() => setConfirmState({ open: false, id: '' })} />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />
    </>
  );
}
