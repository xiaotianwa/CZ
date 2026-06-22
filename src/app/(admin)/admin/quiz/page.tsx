'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface QuizItem {
  id: string;
  question: string;
  options: string; // JSON string
  answer: number;
  isActive: boolean;
  sortOrder: number;
}

interface PaginatedResponse {
  list: QuizItem[];
  pagination: { total: number };
}

const defaultForm = {
  question: '',
  options: ['', '', '', ''] as string[],
  answer: 0,
  isActive: true,
  sortOrder: 0,
};

export default function AdminQuizPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuizItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const quizList = data?.list ?? [];

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await adminGet<PaginatedResponse>('/api/admin/quiz?pageSize=100');
      setData(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchQuiz(); }, [fetchQuiz]);

  const openCreate = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };

  const openEdit = (item: QuizItem) => {
    let opts: string[] = [];
    try { opts = JSON.parse(item.options || '[]'); } catch { /* */ }
    // 保证至少4个选项位
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
    const cleanOptions = form.options.filter((o) => o.trim() !== '');
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
        await adminPut(`/api/admin/quiz/${editing.id}`, payload);
      } else {
        await adminPost('/api/admin/quiz', payload);
      }
      setShowForm(false);
      fetchQuiz();
      setToast({ open: true, message: editing ? '更新成功' : '创建成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/quiz/${id}`);
      fetchQuiz();
      setToast({ open: true, message: '删除成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const handleToggleActive = async (item: QuizItem) => {
    try {
      await adminPut(`/api/admin/quiz/${item.id}`, { isActive: !item.isActive });
      fetchQuiz();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const updateOption = (idx: number, value: string) => {
    const opts = [...form.options];
    opts[idx] = value;
    setForm({ ...form, options: opts });
  };

  const addOption = () => {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ''] });
  };

  const removeOption = (idx: number) => {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, i) => i !== idx);
    let answer = form.answer;
    if (idx === answer) answer = 0;
    else if (idx < answer) answer--;
    setForm({ ...form, options: opts, answer });
  };

  const activeCount = data?.list?.filter((q) => q.isActive).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-body text-text-muted">共 {data?.pagination?.total ?? 0} 道题目</span>
          <span className="tag-success text-caption">{activeCount} 道启用中</span>
        </div>
        <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" /> 添加题目
        </button>
      </div>

      {/* 题目表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑题目' : '添加题目'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 题目 */}
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">题目</label>
                <textarea
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  placeholder="输入题目内容"
                  rows={2}
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              {/* 选项 */}
              <div>
                <label className="text-caption font-medium text-text-muted mb-2 block">选项</label>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 group/opt">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, answer: idx })}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-caption font-bold transition-all cursor-pointer ${
                          form.answer === idx
                            ? 'border-success bg-green-50 text-success'
                            : 'border-gray-200 text-text-muted hover:border-primary'
                        }`}
                        title={form.answer === idx ? '当前正确答案' : '设为正确答案'}
                      >
                        {form.answer === idx ? <CheckCircle className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`选项 ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                      />
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="p-1.5 rounded-lg text-text-disabled hover:text-danger hover:bg-red-50 cursor-pointer transition-colors opacity-0 group-hover/opt:opacity-100 flex-shrink-0"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-border text-caption text-text-muted hover:border-primary hover:text-primary cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> 添加选项
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-2">
                  点击左侧圆圈标记正确答案，当前正确答案：<strong className="text-success">{String.fromCharCode(65 + form.answer)}</strong>
                </p>
              </div>

              <div className="border-t border-border/40" />

              {/* 排序 & 启用 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">排序权重</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                  <select
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '创建题目'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 题目列表 */}
      <div className="grid gap-3">
        {quizList.map((item) => {
          let opts: string[] = [];
          try { opts = JSON.parse(item.options || '[]'); } catch { /* */ }
          return (
            <div key={item.id} className={`card transition-opacity ${!item.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-body font-semibold text-text-title">{item.question}</h3>
                    <span className={`tag text-[10px] ${item.isActive ? 'tag-success' : 'tag-muted'}`}>
                      {item.isActive ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {opts.map((opt, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption ${
                          idx === item.answer
                            ? 'bg-green-50 text-success font-medium border border-success/30'
                            : 'bg-gray-50 text-text-muted border border-transparent'
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + idx)}</span>
                        {opt}
                        {idx === item.answer && <CheckCircle className="w-3 h-3 ml-0.5" />}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`p-1.5 rounded-btn cursor-pointer transition-colors ${
                      item.isActive
                        ? 'text-success hover:bg-green-50'
                        : 'text-text-muted hover:bg-gray-100'
                    }`}
                    title={item.isActive ? '点击停用' : '点击启用'}
                  >
                    {item.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {quizList.length === 0 && (
          <div className="card py-12 text-center">
            <HelpCircle className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body text-text-muted">暂无题目</p>
            <p className="text-caption text-text-muted mt-1">点击"添加题目"开始创建答题验证题目</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除题目"
        message="确定要删除这道题目吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
