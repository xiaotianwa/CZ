'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, X, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import { tcgAdminDelete, tcgAdminGet, tcgAdminPost, tcgAdminPut } from '@/lib/tcg/admin-fetch';

interface TypingSentenceItem {
  id: string;
  content: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: TypingSentenceItem[];
  pagination: { total: number };
}

const defaultForm = {
  content: '',
  category: '弹幕',
  isActive: true,
  sortOrder: 0,
};

export default function TypingSentenceManager() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TypingSentenceItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const list = data?.list ?? [];

  const fetchData = useCallback(async () => {
    try {
      const res = await tcgAdminGet<PaginatedResponse>('/api/tcg/admin/game-typing-sentences?pageSize=100');
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

  const openEdit = (item: TypingSentenceItem) => {
    setForm({ content: item.content, category: item.category, isActive: item.isActive, sortOrder: item.sortOrder });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) { setToast({ open: true, message: '内容不能为空', type: 'error' }); return; }
    try {
      if (editing) {
        await tcgAdminPut(`/api/tcg/admin/game-typing-sentences/${editing.id}`, form);
      } else {
        await tcgAdminPost('/api/tcg/admin/game-typing-sentences', form);
      }
      setShowForm(false);
      fetchData();
      setToast({ open: true, message: editing ? '词条已更新' : '词条已创建', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const doDelete = async () => {
    try {
      const id = confirmState.id;
      setConfirmState({ open: false, id: '' });
      await tcgAdminDelete(`/api/tcg/admin/game-typing-sentences/${id}`);
      fetchData();
      setToast({ open: true, message: '词条已删除', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const handleToggleActive = async (item: TypingSentenceItem) => {
    try {
      await tcgAdminPut(`/api/tcg/admin/game-typing-sentences/${item.id}`, { isActive: !item.isActive });
      fetchData();
      setToast({ open: true, message: item.isActive ? '词条已停用' : '词条已启用', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
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
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>打字赛词库</h2>
            <p className="text-sm text-white/50 mt-0.5">管理 /play/typing 使用的弹幕/金句素材，支持增删改查和启停。</p>
          </div>
          <button onClick={openCreate} className="h-9 px-4 rounded-lg text-white text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer" style={primaryBtnStyle}>
            <Plus className="w-4 h-4" /> 添加词条
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-white/60">
          <span>共 {data?.pagination.total ?? 0} 条词条</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{activeCount} 条启用中</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#141432]/30 divide-y divide-white/5 overflow-hidden">
          {list.map((item) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${!item.isActive ? 'opacity-50' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center flex-shrink-0">
                <Keyboard className="w-4 h-4 text-[#A78BFA]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{item.content}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${item.isActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>{item.isActive ? '启用' : '停用'}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/30">{item.category}</span>
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
          ))}
          {list.length === 0 && (
            <div className="py-12 text-center">
              <Keyboard className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50">暂无打字词条</p>
              <p className="text-xs text-white/40 mt-1">点击&ldquo;添加词条&rdquo;开始配置打字赛词库</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#141432] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center"><Keyboard className="w-4 h-4 text-[#A78BFA]" /></div>
                <h3 className="text-base font-semibold text-white">{editing ? '编辑词条' : '添加词条'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"><X className="w-5 h-5 text-white/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1 block">内容</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="输入打字素材内容" rows={2} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#A78BFA]/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">分类</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#A78BFA]/50">
                    <option value="弹幕">弹幕</option>
                    <option value="金句">金句</option>
                    <option value="其他">其他</option>
                  </select>
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
              <button onClick={handleSubmit} className="h-9 px-5 rounded-lg text-white text-sm font-medium transition-all cursor-pointer" style={primaryBtnStyle}>{editing ? '保存修改' : '创建词条'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmState.open} title="删除词条" message="确定要删除这条打字素材吗？此操作不可撤销。" confirmText="删除" variant="danger" onConfirm={doDelete} onCancel={() => setConfirmState({ open: false, id: '' })} />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />
    </>
  );
}
