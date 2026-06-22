'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Bug, HelpCircle, Trash2, CheckCircle, Eye, Mail, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { adminGet, adminPatch, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

interface FeedbackItem {
  id: string;
  type: string;
  content: string;
  contact: string | null;
  status: string;
  reply: string | null;
  userId: string | null;
  user: { id: string; name: string; avatar: string | null; email: string } | null;
  createdAt: string;
}

interface PaginatedResponse {
  list: FeedbackItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const typeConfig: Record<string, { label: string; icon: typeof Lightbulb; color: string; bg: string }> = {
  suggestion: { label: '建议', icon: Lightbulb, color: 'text-primary', bg: 'bg-primary-bg' },
  question: { label: '答疑', icon: MessageCircle, color: 'text-success', bg: 'bg-green-50' },
  bug: { label: 'Bug', icon: Bug, color: 'text-danger', bg: 'bg-red-50' },
  other: { label: '其他', icon: HelpCircle, color: 'text-text-muted', bg: 'bg-gray-100' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-warning', bg: 'bg-orange-50' },
  read: { label: '已读', color: 'text-primary', bg: 'bg-primary-bg' },
  resolved: { label: '已解决', color: 'text-success', bg: 'bg-green-50' },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminFeedbackPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [replyState, setReplyState] = useState<{ id: string; reply: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await adminGet<PaginatedResponse>(`/api/admin/feedback?${params}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminPatch(`/api/admin/feedback/${id}`, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async () => {
    if (!replyState) return;
    try {
      await adminPatch(`/api/admin/feedback/${replyState.id}`, { reply: replyState.reply.trim(), status: 'resolved' });
      setReplyState(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await adminDelete(`/api/admin/feedback/${confirmState.id}`);
      setConfirmState({ open: false, id: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const items = data?.list || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[
            { key: '', label: '全部' },
            { key: 'pending', label: '待处理' },
            { key: 'read', label: '已读' },
            { key: 'resolved', label: '已解决' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`h-8 px-3 rounded-btn text-caption font-medium transition-colors cursor-pointer ${
                statusFilter === f.key ? 'bg-primary text-white' : 'bg-white border border-border text-text-body hover:border-primary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {pagination && (
          <span className="text-caption text-text-muted">共 {pagination.total} 条</span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center text-body text-text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-body text-text-muted">暂无反馈</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const tc = typeConfig[item.type] || typeConfig.other;
            const sc = statusConfig[item.status] || statusConfig.pending;
            const TypeIcon = tc.icon;

            return (
              <div key={item.id} className="card">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                    <TypeIcon className={`w-4 h-4 ${tc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`tag ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <span className={`tag ${tc.bg} ${tc.color}`}>{tc.label}</span>
                      {item.user && (
                        <span className="text-caption text-text-muted">
                          来自 <strong className="text-text-body">{item.user.name}</strong>
                        </span>
                      )}
                      {!item.user && <span className="text-caption text-text-disabled">匿名用户</span>}
                      <span className="text-caption text-text-disabled ml-auto flex-shrink-0">{formatTime(item.createdAt)}</span>
                    </div>

                    <p className="text-body text-text-body mt-2 whitespace-pre-wrap">{item.content}</p>

                    {item.contact && (
                      <div className="flex items-center gap-1.5 mt-2 text-caption text-text-muted">
                        <Mail className="w-3.5 h-3.5" />
                        {item.contact}
                      </div>
                    )}

                    {item.reply && (
                      <div className="mt-3 p-3 rounded-btn bg-primary-bg border border-primary/10">
                        <p className="text-caption font-medium text-primary mb-1">管理员回复</p>
                        <p className="text-body text-text-body">{item.reply}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-divider">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'read')}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-btn text-caption font-medium text-primary hover:bg-primary-bg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> 标为已读
                        </button>
                      )}
                      {item.status !== 'resolved' && (
                        <button
                          onClick={() => handleStatusChange(item.id, 'resolved')}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-btn text-caption font-medium text-success hover:bg-green-50 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> 标为已解决
                        </button>
                      )}
                      <button
                        onClick={() => setReplyState({ id: item.id, reply: item.reply || '' })}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-btn text-caption font-medium text-text-muted hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" /> {item.reply ? '编辑回复' : '回复'}
                      </button>
                      <button
                        onClick={() => setConfirmState({ open: true, id: item.id })}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-btn text-caption font-medium text-danger hover:bg-red-50 transition-colors cursor-pointer ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 px-3 rounded-btn border border-border text-caption text-text-body hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-caption text-text-muted">
            {page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-3 rounded-btn border border-border text-caption text-text-body hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reply Modal */}
      {replyState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReplyState(null)} />
          <div className="relative bg-white rounded-card shadow-dropdown w-full max-w-md p-6">
            <h3 className="text-body font-semibold text-text-title mb-3">回复反馈</h3>
            <textarea
              value={replyState.reply}
              onChange={(e) => setReplyState({ ...replyState, reply: e.target.value })}
              placeholder="输入你的回复..."
              maxLength={500}
              className="w-full h-28 px-3 py-2.5 rounded-btn border border-border text-body text-text-body placeholder:text-text-disabled resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setReplyState(null)}
                className="h-9 px-4 rounded-btn border border-border text-body font-medium text-text-body hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleReply}
                disabled={!replyState.reply.trim()}
                className="btn-primary h-9 px-4 disabled:opacity-50"
              >
                发送回复
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        message="确定删除这条反馈？删除后无法恢复。"
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
    </div>
  );
}
