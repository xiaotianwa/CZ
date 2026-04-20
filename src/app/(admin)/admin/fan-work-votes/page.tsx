'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Trophy, Eye, Calendar, Vote, Loader2 } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import SafeImage from '@/components/SafeImage';

interface Period {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
  _count: { votes: number };
}

interface RankingItem {
  fanWorkId: string;
  title: string;
  cover: string;
  authorName: string;
  totalVotes: number;
  score: number;
  avgScore: number;
  ratings: Record<string, number>;
}

const RATING_CONFIG: Record<string, { label: string; emoji: string }> = {
  awesome: { label: '夯爆了', emoji: '🔥' },
  good: { label: '夯', emoji: '👍' },
  normal: { label: '一般', emoji: '😐' },
  bad: { label: '拉', emoji: '👎' },
  terrible: { label: '拉爆了', emoji: '💩' },
};

const defaultForm = { title: '', startAt: '', endAt: '', isActive: true };

export default function AdminFanWorkVotesPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

  // 查看排名
  const [viewingPeriod, setViewingPeriod] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [periodInfo, setPeriodInfo] = useState<{ title: string; totalVotes: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
  };

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await adminGet('/api/admin/fan-work-votes');
      const d = res.data as { items?: Period[] } | Period[] | undefined;
      if (d && 'items' in d && d.items) setPeriods(d.items);
      else if (Array.isArray(d)) setPeriods(d);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (p: Period) => {
    setEditing(p);
    setForm({
      title: p.title,
      startAt: p.startAt.slice(0, 16),
      endAt: p.endAt.slice(0, 16),
      isActive: p.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { showToast('请输入标题', 'error'); return; }
    if (!form.startAt || !form.endAt) { showToast('请设置时间范围', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminPut('/api/admin/fan-work-votes', { id: editing.id, ...form });
        showToast('更新成功');
      } else {
        await adminPost('/api/admin/fan-work-votes', form);
        showToast('创建成功');
      }
      setShowForm(false);
      fetchPeriods();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDelete(`/api/admin/fan-work-votes?id=${id}`);
      showToast('删除成功');
      fetchPeriods();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const viewRanking = async (periodId: string) => {
    setViewingPeriod(periodId);
    setRankingLoading(true);
    try {
      const res = await adminGet(`/api/admin/fan-work-votes/${periodId}`);
      const d = res.data as { ranking?: RankingItem[]; period?: { title: string }; totalVotes?: number } | undefined;
      if (d) {
        setRanking(d.ranking || []);
        setPeriodInfo({ title: d.period?.title || '', totalVotes: d.totalVotes || 0 });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error');
    }
    setRankingLoading(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const isActive = (p: Period) => {
    const now = new Date();
    return p.isActive && new Date(p.startAt) <= now && new Date(p.endAt) >= now;
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg text-text-title">二创投票管理</h1>
          <p className="text-body text-text-muted mt-1">管理投票周期，查看投票排名</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-btn bg-primary text-white text-body font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          新建周期
        </button>
      </div>

      {/* 创建/编辑表单 */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <h3 className="text-heading-sm text-text-title">{editing ? '编辑投票周期' : '新建投票周期'}</h3>
          <div>
            <label className="text-caption font-medium text-text-muted mb-1 block">标题</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="如：2024年7月二创投票"
              className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-text-muted mb-1 block">开始时间</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="text-caption font-medium text-text-muted mb-1 block">结束时间</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-gray-50/50 text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-caption text-text-body">启用</span>
            </label>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="h-9 px-5 rounded-btn bg-primary text-white text-body font-medium hover:bg-primary/90 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</> : editing ? '更新' : '创建'}
            </button>
            <button onClick={() => setShowForm(false)} className="h-9 px-5 rounded-btn border border-border text-text-body text-body hover:bg-gray-50 cursor-pointer">取消</button>
          </div>
        </div>
      )}

      {/* 周期列表 */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 text-text-disabled animate-spin mx-auto" />
        </div>
      ) : periods.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Vote className="w-12 h-12 text-text-disabled mb-3" />
          <p className="text-body text-text-muted">还没有投票周期</p>
          <p className="text-caption text-text-disabled mt-1">点击上方按钮创建第一个投票周期</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive(p) ? 'bg-green-50 text-success' : 'bg-gray-100 text-text-muted'}`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-body font-semibold text-text-title">{p.title}</h3>
                      {isActive(p) && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-success">进行中</span>
                      )}
                      {!p.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-text-muted">已停用</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-caption text-text-muted">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.startAt)} ~ {formatDate(p.endAt)}</span>
                      <span className="inline-flex items-center gap-1"><Vote className="w-3 h-3" />{p._count.votes} 票</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => viewRanking(p.id)} className="p-1.5 text-text-muted hover:bg-gray-50 rounded-btn cursor-pointer" title="查看排名">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 text-text-muted hover:bg-gray-50 rounded-btn cursor-pointer" title="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmState({ open: true, id: p.id })} className="p-1.5 text-text-muted hover:text-danger hover:bg-red-50 rounded-btn cursor-pointer" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 排名详情弹窗 */}
      {viewingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingPeriod(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-heading-sm text-text-title">
                  <Trophy className="w-5 h-5 text-primary inline mr-1.5" />
                  {periodInfo?.title || '投票排名'}
                </h3>
                {periodInfo && <p className="text-caption text-text-muted mt-0.5">共 {periodInfo.totalVotes} 票</p>}
              </div>
              <button onClick={() => setViewingPeriod(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                <span className="text-lg text-text-muted">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {rankingLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-text-disabled animate-spin mx-auto" />
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-12">
                  <Vote className="w-8 h-8 text-text-disabled mx-auto mb-2" />
                  <p className="text-body text-text-muted">暂无投票数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ranking.map((item, idx) => {
                    const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
                    return (
                      <div key={item.fanWorkId} className={`flex items-center gap-3 p-3 rounded-xl ${idx < 3 ? 'bg-primary/5' : 'bg-gray-50/50'}`}>
                        <div className="w-8 text-center flex-shrink-0">
                          {idx < 3 ? <Trophy className={`w-5 h-5 mx-auto ${medalColors[idx]}`} /> : <span className="text-body font-bold text-text-muted">{idx + 1}</span>}
                        </div>
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <SafeImage src={item.cover} alt={item.title} width={40} height={40} className="object-cover w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium text-text-title truncate">{item.title}</p>
                          <p className="text-caption text-text-muted">{item.authorName}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {Object.entries(RATING_CONFIG).map(([key, cfg]) => {
                            const count = item.ratings[key] || 0;
                            if (count === 0) return null;
                            return (
                              <span key={key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] text-text-muted" title={cfg.label}>
                                {cfg.emoji}{count}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-right flex-shrink-0 w-16">
                          <p className="text-body font-semibold text-text-title">{item.score}分</p>
                          <p className="text-caption text-text-muted">{item.totalVotes}票</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title="删除投票周期"
        message="确定要删除这个投票周期吗？所有投票记录将一并删除，此操作不可撤销。"
        onConfirm={() => { handleDelete(confirmState.id); setConfirmState({ open: false, id: '' }); }}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  );
}
