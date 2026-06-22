'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, ShieldBan, Eye, EyeOff, Search, Upload } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface BannedWordItem {
  id: string;
  word: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  list: BannedWordItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const categoryMap: Record<string, { label: string; cls: string }> = {
  politics: { label: '政治', cls: 'bg-red-50 text-red-600' },
  porn: { label: '色情', cls: 'bg-pink-50 text-pink-600' },
  gambling: { label: '赌博', cls: 'bg-orange-50 text-orange-600' },
  violence: { label: '暴力', cls: 'bg-amber-50 text-amber-700' },
  ad: { label: '广告', cls: 'bg-blue-50 text-blue-600' },
  abuse: { label: '辱骂', cls: 'bg-purple-50 text-purple-600' },
  custom: { label: '自定义', cls: 'bg-gray-100 text-text-body' },
};

const categoryOptions = Object.entries(categoryMap);

export default function AdminBannedWordsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [editing, setEditing] = useState<BannedWordItem | null>(null);
  const [form, setForm] = useState({ word: '', category: 'custom', isActive: true });
  const [batchForm, setBatchForm] = useState({ words: '', category: 'custom' });
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'error' });
  const wordList = data?.list ?? [];
  const totalPages = data?.pagination?.totalPages ?? 0;

  const fetchList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (keyword) params.set('keyword', keyword);
      if (filterCategory) params.set('category', filterCategory);
      const res = await adminGet<PaginatedResponse>(`/api/admin/banned-words?${params}`);
      setData(res.data);
    } catch (err) { console.error(err); }
  }, [page, keyword, filterCategory]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openCreate = () => {
    setForm({ word: '', category: 'custom', isActive: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: BannedWordItem) => {
    setForm({ word: item.word, category: item.category, isActive: item.isActive });
    setEditing(item);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.word.trim()) {
      setToast({ open: true, message: '违禁词不能为空', type: 'error' }); return;
    }
    try {
      if (editing) {
        await adminPut(`/api/admin/banned-words/${editing.id}`, form);
      } else {
        await adminPost('/api/admin/banned-words', form);
      }
      setShowForm(false);
      fetchList();
      setToast({ open: true, message: editing ? '更新成功' : '添加成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchForm.words.trim()) {
      setToast({ open: true, message: '请输入违禁词', type: 'error' }); return;
    }
    try {
      const res = await adminPost<{ created: number; skipped: number }>('/api/admin/banned-words', batchForm);
      setShowBatch(false);
      setBatchForm({ words: '', category: 'custom' });
      fetchList();
      setToast({ open: true, message: `成功添加 ${res.data.created} 个${res.data.skipped > 0 ? `，跳过 ${res.data.skipped} 个重复` : ''}`, type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleToggle = async (item: BannedWordItem) => {
    try {
      await adminPut(`/api/admin/banned-words/${item.id}`, { isActive: !item.isActive });
      fetchList();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => { setConfirmState({ open: true, id }); };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/banned-words/${id}`);
      fetchList();
      setToast({ open: true, message: '删除成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const activeCount = data?.list?.filter((w) => w.isActive).length ?? 0;

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-body text-text-muted">共 {data?.pagination?.total ?? 0} 个违禁词</span>
          <span className="tag-success text-caption">{activeCount} 个启用中</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBatch(true)} className="btn-outline h-9 px-4 flex items-center gap-1.5 text-caption">
            <Upload className="w-4 h-4" /> 批量添加
          </button>
          <button onClick={openCreate} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
            <Plus className="w-4 h-4" /> 添加违禁词
          </button>
        </div>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索违禁词..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setFilterCategory(''); setPage(1); }}
            className={`h-8 px-3 rounded-full text-caption font-medium transition-all cursor-pointer border ${
              !filterCategory ? 'bg-primary-bg text-primary border-primary/30' : 'bg-white text-text-muted border-border hover:border-gray-300'
            }`}
          >
            全部
          </button>
          {categoryOptions.map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setFilterCategory(key); setPage(1); }}
              className={`h-8 px-3 rounded-full text-caption font-medium transition-all cursor-pointer border ${
                filterCategory === key ? `${val.cls} border-current` : 'bg-white text-text-muted border-border hover:border-gray-300'
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* 单个添加/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShieldBan className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">{editing ? '编辑违禁词' : '添加违禁词'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">违禁词</label>
                <input
                  value={form.word}
                  onChange={(e) => setForm({ ...form, word: e.target.value })}
                  placeholder="输入违禁词"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">分类</label>
                <div className="flex gap-2 flex-wrap">
                  {categoryOptions.map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, category: key })}
                      className={`h-8 px-3 rounded-full text-caption font-medium transition-all cursor-pointer border ${
                        form.category === key
                          ? `${val.cls} border-current`
                          : 'bg-white text-text-muted border-border hover:border-gray-300'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">状态</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`w-full h-9 rounded-lg border text-body font-medium cursor-pointer transition-colors ${
                    form.isActive ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-gray-50/50 text-text-muted'
                  }`}
                >
                  {form.isActive ? '启用中' : '已停用'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowForm(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleSubmit} className="btn-primary h-9 px-5 text-caption">{editing ? '保存修改' : '添加'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加弹窗 */}
      {showBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBatch(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-heading-sm">批量添加违禁词</h3>
              </div>
              <button onClick={() => setShowBatch(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">违禁词列表</label>
                <textarea
                  value={batchForm.words}
                  onChange={(e) => setBatchForm({ ...batchForm, words: e.target.value })}
                  placeholder={'多个违禁词用逗号、中文逗号或换行分隔\n例如：\n词语1，词语2，词语3\n词语4\n词语5'}
                  rows={6}
                  className="w-full p-3 rounded-lg border border-border bg-gray-50/50 text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-caption font-medium text-text-muted mb-1 block">分类</label>
                <div className="flex gap-2 flex-wrap">
                  {categoryOptions.map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBatchForm({ ...batchForm, category: key })}
                      className={`h-8 px-3 rounded-full text-caption font-medium transition-all cursor-pointer border ${
                        batchForm.category === key
                          ? `${val.cls} border-current`
                          : 'bg-white text-text-muted border-border hover:border-gray-300'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-gray-50/50">
              <button onClick={() => setShowBatch(false)} className="btn-outline h-9 px-5 text-caption">取消</button>
              <button onClick={handleBatchSubmit} className="btn-primary h-9 px-5 text-caption">批量添加</button>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border/60 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-text-muted">违禁词</th>
              <th className="text-left px-4 py-3 font-medium text-text-muted w-32">分类</th>
              <th className="text-left px-4 py-3 text-caption font-medium text-text-muted">状态</th>
              <th className="text-left px-4 py-3 text-caption font-medium text-text-muted">添加时间</th>
              <th className="text-center px-4 py-3 font-medium text-text-muted w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {wordList.map((item) => {
              const cat = categoryMap[item.category] || categoryMap.custom;
              return (
                <tr key={item.id} className={`border-b border-border/40 hover:bg-gray-50/50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-text-title">{item.word}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${cat.cls}`}>
                      {cat.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${item.isActive ? 'bg-green-50 text-success' : 'bg-gray-100 text-text-muted'}`}>
                      {item.isActive ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-caption text-text-muted">
                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleToggle(item)}
                        className="p-1.5 rounded-btn cursor-pointer text-text-muted hover:bg-gray-100 transition-colors"
                        title={item.isActive ? '停用' : '启用'}
                      >
                        {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {wordList.length === 0 && (
          <div className="py-12 text-center">
            <ShieldBan className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body text-text-muted">暂无违禁词</p>
            <p className="text-caption text-text-muted mt-1">点击"添加违禁词"或"批量添加"来管理违禁词库</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-outline h-8 px-3 text-caption disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-caption text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-outline h-8 px-3 text-caption disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title="删除违禁词"
        message="确定要删除这个违禁词吗？删除后将不再过滤该词。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
