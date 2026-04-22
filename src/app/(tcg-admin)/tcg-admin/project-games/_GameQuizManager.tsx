'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, X, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import { tcgAdminDelete, tcgAdminGet, tcgAdminPost, tcgAdminPut } from '@/lib/tcg/admin-fetch';

interface GameQuizItem {
  id: string;
  question: string;
  options: string;
  answer: number;
  isActive: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: GameQuizItem[];
  pagination: { total: number };
}

const defaultForm = {
  question: '',
  options: ['', '', '', ''] as string[],
  answer: 0,
  isActive: true,
  sortOrder: 0,
};

export default function GameQuizManager() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameQuizItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const quizList = data?.list ?? [];

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await tcgAdminGet<PaginatedResponse>('/api/tcg/admin/game-quiz-questions?pageSize=100');
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: GameQuizItem) => {
    let opts: string[] = [];
    try {
      opts = JSON.parse(item.options || '[]') as string[];
    } catch {
      opts = [];
    }
    while (opts.length < 2) opts.push('');
    setForm({
      question: item.question,
      options: opts,
      answer: item.answer,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const cleanOptions = form.options.filter((option) => option.trim() !== '');
    if (!form.question.trim()) {
      setToast({ open: true, message: '题目不能为空', type: 'error' });
      return;
    }
    if (cleanOptions.length < 2) {
      setToast({ open: true, message: '至少需要2个选项', type: 'error' });
      return;
    }
    if (form.answer >= cleanOptions.length) {
      setToast({ open: true, message: '正确答案索引超出选项范围', type: 'error' });
      return;
    }

    try {
      const payload = { ...form, options: cleanOptions };
      if (editing) {
        await tcgAdminPut(`/api/tcg/admin/game-quiz-questions/${editing.id}`, payload);
      } else {
        await tcgAdminPost('/api/tcg/admin/game-quiz-questions', payload);
      }
      setShowForm(false);
      fetchQuiz();
      setToast({ open: true, message: editing ? '题目已更新' : '题目已创建', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const doDelete = async () => {
    try {
      const id = confirmState.id;
      setConfirmState({ open: false, id: '' });
      await tcgAdminDelete(`/api/tcg/admin/game-quiz-questions/${id}`);
      fetchQuiz();
      setToast({ open: true, message: '题目已删除', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const handleToggleActive = async (item: GameQuizItem) => {
    try {
      await tcgAdminPut(`/api/tcg/admin/game-quiz-questions/${item.id}`, { isActive: !item.isActive });
      fetchQuiz();
      setToast({ open: true, message: item.isActive ? '题目已停用' : '题目已启用', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const updateOption = (index: number, value: string) => {
    const next = [...form.options];
    next[index] = value;
    setForm({ ...form, options: next });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ''] });
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) return;
    const nextOptions = form.options.filter((_, optionIndex) => optionIndex !== index);
    let nextAnswer = form.answer;
    if (index === nextAnswer) nextAnswer = 0;
    else if (index < nextAnswer) nextAnswer -= 1;
    setForm({ ...form, options: nextOptions, answer: nextAnswer });
  };

  const activeCount = quizList.filter((item) => item.isActive).length;

  const primaryBtnStyle = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
  } as const;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>1103 知识问答管理</h2>
            <p className="text-sm text-white/50 mt-0.5">这里维护的是游戏子模块题库，不再复用社区注册验证题目。</p>
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
          {quizList.map((item) => {
            let options: string[] = [];
            try {
              options = JSON.parse(item.options || '[]') as string[];
            } catch {
              options = [];
            }

            return (
              <div key={item.id} className={`flex items-start gap-3 px-4 py-3 transition-opacity ${!item.isActive ? 'opacity-50' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-white">{item.question}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${item.isActive ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-white/40 border-white/10'}`}>
                      {item.isActive ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {options.map((option, index) => (
                      <span key={index} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${index === item.answer ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium' : 'bg-white/5 text-white/60 border-white/10'}`}>
                        <span className="font-bold">{String.fromCharCode(65 + index)}</span>
                        {option}
                        {index === item.answer && <CheckCircle className="w-3 h-3 ml-0.5" />}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleToggleActive(item)} className={`p-1.5 rounded cursor-pointer transition-colors ${item.isActive ? 'text-emerald-300 hover:bg-emerald-500/10' : 'text-white/40 hover:bg-white/5'}`} title={item.isActive ? '点击停用' : '点击启用'}>
                    {item.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded text-white/60 hover:text-[#A78BFA] hover:bg-white/5 cursor-pointer transition-colors" title="编辑">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmState({ open: true, id: item.id })} className="p-1.5 rounded text-white/50 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors" title="删除">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {quizList.length === 0 && (
            <div className="py-12 text-center">
              <HelpCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50">暂无游戏问答题目</p>
              <p className="text-xs text-white/40 mt-1">点击&ldquo;添加题目&rdquo;开始配置游戏专属题库</p>
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
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <h3 className="text-base font-semibold text-white">{editing ? '编辑题目' : '添加题目'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <label className="text-xs font-medium text-white/60 mb-1 block">题目</label>
                <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="输入题目内容" rows={2} className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm resize-none focus:outline-none focus:border-[#A78BFA]/50" />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 mb-2 block">选项</label>
                <div className="space-y-2">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2 group/opt">
                      <button type="button" onClick={() => setForm({ ...form, answer: index })} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all cursor-pointer ${form.answer === index ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300' : 'border-white/15 text-white/50 hover:border-[#A78BFA]/50'}`} title={form.answer === index ? '当前正确答案' : '设为正确答案'}>
                        {form.answer === index ? <CheckCircle className="w-4 h-4" /> : String.fromCharCode(65 + index)}
                      </button>
                      <input value={option} onChange={(e) => updateOption(index, e.target.value)} placeholder={`选项 ${String.fromCharCode(65 + index)}`} className="flex-1 h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50" />
                      {form.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(index)} className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors opacity-0 group-hover/opt:opacity-100 flex-shrink-0">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button type="button" onClick={addOption} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-white/15 text-xs text-white/60 hover:border-[#A78BFA]/50 hover:text-[#A78BFA] cursor-pointer transition-colors">
                      <Plus className="w-3.5 h-3.5" /> 添加选项
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">排序权重</label>
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

      <ConfirmDialog open={confirmState.open} title="删除题目" message="确定要删除这道游戏问答题目吗？此操作不可撤销。" confirmText="删除" variant="danger" onConfirm={doDelete} onCancel={() => setConfirmState({ open: false, id: '' })} />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((prev) => ({ ...prev, open: false }))} />
    </>
  );
}
