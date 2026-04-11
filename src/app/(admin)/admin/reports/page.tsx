'use client';

import { useState, useEffect } from 'react';
import { Flag, CheckCircle, XCircle, Eye, Clock, AlertTriangle } from 'lucide-react';
import { adminGet, adminPatch } from '@/lib/admin-fetch';

interface ReportItem {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reporter: { id: string; name: string; avatar: string | null };
}

const reasonMap: Record<string, string> = {
  spam: '垃圾内容',
  abuse: '辱骂/骚扰',
  inappropriate: '不当内容',
  other: '其他',
};

const targetTypeMap: Record<string, string> = {
  post: '帖子',
  comment: '评论',
  user: '用户',
};

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: '待处理', cls: 'bg-orange-50 text-warning', icon: Clock },
  reviewed: { label: '已查看', cls: 'bg-primary-bg text-primary', icon: Eye },
  resolved: { label: '已处理', cls: 'bg-green-50 text-success', icon: CheckCircle },
  dismissed: { label: '已驳回', cls: 'bg-gray-100 text-text-muted', icon: XCircle },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchReports = () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (filter) params.set('status', filter);
    adminGet<{ list: ReportItem[] }>(`/api/admin/reports?${params}`)
      .then((res) => setReports(res.data.list))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReports(); }, [filter]);

  const handleAction = async (id: string, status: string) => {
    try {
      await adminPatch(`/api/admin/reports/${id}`, { status, adminNote: adminNote || undefined });
      setActionId(null);
      setAdminNote('');
      fetchReports();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading text-text-title flex items-center gap-2">
          <Flag className="w-6 h-6 text-primary" /> 举报管理
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: '', label: '全部' },
          { key: 'pending', label: '待处理' },
          { key: 'reviewed', label: '已查看' },
          { key: 'resolved', label: '已处理' },
          { key: 'dismissed', label: '已驳回' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-8 px-3 rounded-btn text-body font-medium transition-colors cursor-pointer ${
              filter === f.key ? 'bg-primary text-white' : 'bg-white border border-divider text-text-body hover:border-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="card text-danger">{error}</div>}

      {loading ? (
        <div className="card text-center py-12 text-text-muted">加载中...</div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12">
          <Flag className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-body text-text-muted">暂无举报</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const sc = statusConfig[report.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <div key={report.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-caption font-medium ${sc.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                      <span className="tag bg-gray-100 text-text-body">{targetTypeMap[report.targetType] || report.targetType}</span>
                      <span className="tag bg-orange-50 text-warning">{reasonMap[report.reason] || report.reason}</span>
                    </div>

                    <div className="mt-2 text-body text-text-body">
                      <span className="font-medium">{report.reporter.name}</span>
                      <span className="text-text-muted"> 举报了{targetTypeMap[report.targetType]}</span>
                      <span className="text-text-disabled text-caption ml-2">ID: {report.targetId}</span>
                    </div>

                    {report.description && (
                      <p className="mt-1 text-caption text-text-muted bg-gray-50 rounded-btn px-3 py-2">
                        {report.description}
                      </p>
                    )}

                    {report.adminNote && (
                      <p className="mt-1 text-caption text-primary bg-primary-bg rounded-btn px-3 py-2">
                        管理员备注: {report.adminNote}
                      </p>
                    )}

                    <p className="text-caption text-text-disabled mt-2">{timeAgo(report.createdAt)}</p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      {actionId === report.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="备注(可选)"
                            className="w-full h-8 px-2 rounded-btn border border-border text-caption"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => handleAction(report.id, 'resolved')} className="btn-primary h-7 px-3 text-caption">
                              处理
                            </button>
                            <button onClick={() => handleAction(report.id, 'dismissed')} className="btn-outline h-7 px-3 text-caption">
                              驳回
                            </button>
                            <button onClick={() => { setActionId(null); setAdminNote(''); }} className="text-caption text-text-muted px-2 cursor-pointer">
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActionId(report.id)}
                          className="btn-outline h-8 px-3 text-caption inline-flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> 处理
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
