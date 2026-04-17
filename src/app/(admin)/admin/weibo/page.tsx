'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Trash2, Eye, EyeOff, ExternalLink, Heart, MessageCircle,
  Repeat, Clock, CheckCircle2, XCircle, Image as ImageIcon, Film,
} from 'lucide-react';
import { adminGet, adminPost, adminPatch, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';

interface WeiboItem {
  id: string;
  mid: string;
  bid: string | null;
  uid: string;
  screenName: string;
  avatar: string | null;
  text: string;
  images: string[];
  videoUrl: string | null;
  videoCover: string | null;
  source: string | null;
  sourceUrl: string;
  repostCount: number;
  commentCount: number;
  likeCount: number;
  publishedAt: string;
  fetchedAt: string;
  isVisible: boolean;
}

interface SyncResultInfo {
  success: boolean;
  fetched: number;
  inserted: number;
  skipped: number;
  filtered: number;
  durationMs: number;
  error?: string;
  newMids: string[];
}

interface SyncStatusInfo {
  isRunning: boolean;
  lastRunAt: string | null;
  lastResult: SyncResultInfo | null;
}

interface ListResponse {
  list: WeiboItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
  stats: { total: number; visibleCount: number; hiddenCount: number };
  syncStatus: SyncStatusInfo;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return '刚刚';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', { hour12: false });
}

export default function AdminWeiboPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet<ListResponse>('/api/admin/weibo?pageSize=50');
      setData(res.data);
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await adminPost<SyncResultInfo>('/api/admin/weibo', {});
      const result = res.data;
      const msg = result.success
        ? `同步完成：新增 ${result.inserted} 条，去重跳过 ${result.skipped} 条${result.filtered > 0 ? `，过滤非原创 ${result.filtered} 条` : ''}`
        : result.error || '同步失败';
      setToast({ open: true, message: msg, type: result.success ? 'success' : 'error' });
      await fetchList();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '同步失败', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleVisible = async (item: WeiboItem) => {
    try {
      await adminPatch(`/api/admin/weibo/${item.id}`, { isVisible: !item.isVisible });
      await fetchList();
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => { setConfirmState({ open: true, id }); };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    try {
      await adminDelete(`/api/admin/weibo/${id}`);
      await fetchList();
      setToast({ open: true, message: '删除成功', type: 'success' });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const stats = data?.stats;
  const lastResult = data?.syncStatus.lastResult;

  return (
    <div className="space-y-4">
      {/* ========== 顶部操作栏 ========== */}
      <div className="card !p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-caption text-text-muted">监控博主</p>
              <a
                href="https://weibo.com/u/7795649284"
                target="_blank"
                rel="noopener noreferrer"
                className="text-body font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                陈泽 · UID 7795649284 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="h-8 w-px bg-divider" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-caption text-text-muted">总条数</p>
                <p className="text-heading-sm text-text-title">{stats?.total ?? 0}</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">展示中</p>
                <p className="text-heading-sm text-success">{stats?.visibleCount ?? 0}</p>
              </div>
              <div>
                <p className="text-caption text-text-muted">已隐藏</p>
                <p className="text-heading-sm text-text-muted">{stats?.hiddenCount ?? 0}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中…' : '立即同步'}
          </button>
        </div>

        {/* 上次同步状态 */}
        {lastResult && (
          <div className="mt-3 pt-3 border-t border-divider flex items-center gap-3 flex-wrap text-caption">
            {lastResult.success ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="w-3.5 h-3.5" /> 上次同步成功
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-danger">
                <XCircle className="w-3.5 h-3.5" /> 上次同步失败：{lastResult.error}
              </span>
            )}
            <span className="text-text-muted inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(data?.syncStatus.lastRunAt ?? null)}
            </span>
            <span className="text-text-muted">
              抓取 {lastResult.fetched} · 新增 <b className="text-primary">{lastResult.inserted}</b> · 跳过 {lastResult.skipped} · 过滤 {lastResult.filtered} · 耗时 {lastResult.durationMs}ms
            </span>
          </div>
        )}
      </div>

      {/* ========== 列表 ========== */}
      {loading && !data && (
        <div className="card py-12 text-center text-text-muted">加载中...</div>
      )}

      <div className="grid gap-3">
        {data?.list.map((item) => (
          <div key={item.id} className={`card transition-opacity ${!item.isVisible ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center flex-shrink-0 text-primary font-bold">
                {item.screenName?.[0] || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-body font-semibold text-text-title">{item.screenName}</span>
                  <span className={`tag text-[10px] ${item.isVisible ? 'tag-success' : 'tag-muted'}`}>
                    {item.isVisible ? '展示中' : '已隐藏'}
                  </span>
                  {item.videoUrl && (
                    <span className="tag tag-primary text-[10px] inline-flex items-center gap-0.5">
                      <Film className="w-3 h-3" /> 视频
                    </span>
                  )}
                  {item.images.length > 0 && (
                    <span className="tag tag-muted text-[10px] inline-flex items-center gap-0.5">
                      <ImageIcon className="w-3 h-3" /> {item.images.length}
                    </span>
                  )}
                </div>

                <p className="text-body text-text-body whitespace-pre-wrap break-words line-clamp-4">
                  {item.text || <span className="text-text-muted italic">（无文字内容）</span>}
                </p>

                {/* 图片预览 */}
                {item.images.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {item.images.slice(0, 9).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-md object-cover border border-border/60 hover:border-primary transition-colors"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* 视频预览 */}
                {item.videoCover && (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block w-40">
                    <div className="relative rounded-md overflow-hidden border border-border/60">
                      <img
                        src={item.videoCover}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                          <Film className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  </a>
                )}

                {/* 元信息 */}
                <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> 发布于 {formatDateTime(item.publishedAt)}
                  </span>
                  {item.source && <span>来自 {item.source}</span>}
                  <span className="inline-flex items-center gap-0.5">
                    <Repeat className="w-3 h-3" /> {item.repostCount}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageCircle className="w-3 h-3" /> {item.commentCount}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Heart className="w-3 h-3" /> {item.likeCount}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> 原微博
                  </a>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleVisible(item)}
                  className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 cursor-pointer"
                  title={item.isVisible ? '隐藏' : '显示'}
                >
                  {item.isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 cursor-pointer"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {data && data.list.length === 0 && (
          <div className="card py-12 text-center">
            <RefreshCw className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body text-text-muted">暂无已抓取的微博</p>
            <p className="text-caption text-text-muted mt-1">点击"立即同步"拉取一次，或等待定时任务触发</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="删除微博"
        message="确定要从本地数据库删除这条微博吗？定时同步不会重新拉取已删除的微博（基于 mid 去重）。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
