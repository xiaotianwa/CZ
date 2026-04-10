'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pin, Eye, EyeOff, Search } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

interface PostItem {
  id: string;
  content: string;
  images: string;
  isPinned: boolean;
  likes: number;
  status: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
  _count: { comments: number };
  postTags: { tag: { id: string; name: string } }[];
}

interface PaginatedResponse {
  list: PostItem[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

export default function AdminPostsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('keyword', keyword);
      if (statusFilter) params.set('status', statusFilter);
      const res = await adminGet<PaginatedResponse>(`/api/admin/posts?${params}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    await adminPut(`/api/admin/posts/${id}`, { isPinned: !isPinned });
    fetchPosts();
  };

  const handleToggleStatus = async (id: string, status: string) => {
    const newStatus = status === 'published' ? 'hidden' : 'published';
    await adminPut(`/api/admin/posts/${id}`, { status: newStatus });
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    setConfirmState({ open: true, id });
  };

  const doDelete = async () => {
    const id = confirmState.id;
    setConfirmState({ open: false, id: '' });
    await adminDelete(`/api/admin/posts/${id}`);
    fetchPosts();
  };

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    await adminPost('/api/admin/posts', {
      content: newContent,
      authorId: 'admin',
      status: 'published',
    });
    setNewContent('');
    setShowCreate(false);
    fetchPosts();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="搜索帖子内容..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="w-full h-9 pl-9 pr-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-btn border border-border bg-white text-body focus:outline-none focus:border-primary"
        >
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="hidden">已隐藏</option>
          <option value="draft">草稿</option>
        </select>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary h-9 px-4 flex items-center gap-1.5 text-caption">
          <Plus className="w-4 h-4" />
          发布帖子
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card space-y-3">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="输入帖子内容..."
            rows={3}
            className="w-full p-3 rounded-btn border border-border bg-white text-body resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary h-8 px-4 text-caption">发布</button>
            <button onClick={() => setShowCreate(false)} className="btn-outline h-8 px-4 text-caption">取消</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-divider bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-text-muted">内容</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted w-24">作者</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-20">状态</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-16">赞</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-16">评论</th>
                <th className="text-center px-4 py-3 font-medium text-text-muted w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">加载中...</td></tr>
              )}
              {!loading && data?.list.map((post) => (
                <tr key={post.id} className="border-b border-divider last:border-0 hover:bg-gray-50/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.isPinned && <Pin className="w-3.5 h-3.5 text-danger flex-shrink-0" />}
                      <span className="line-clamp-1">{post.content}</span>
                    </div>
                    {post.postTags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {post.postTags.map((pt) => (
                          <span key={pt.tag.id} className="tag-primary text-[10px] px-1.5 h-4">{pt.tag.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{post.author.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`tag text-[10px] ${post.status === 'published' ? 'tag-success' : post.status === 'hidden' ? 'tag-muted' : 'tag-primary'}`}>
                      {post.status === 'published' ? '已发布' : post.status === 'hidden' ? '已隐藏' : '草稿'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">{post.likes}</td>
                  <td className="px-4 py-3 text-center text-text-muted">{post._count.comments}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleTogglePin(post.id, post.isPinned)}
                        className={`p-1.5 rounded-btn transition-colors cursor-pointer ${post.isPinned ? 'text-danger hover:bg-red-50' : 'text-text-muted hover:bg-gray-100'}`}
                        title={post.isPinned ? '取消置顶' : '置顶'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(post.id, post.status)}
                        className="p-1.5 rounded-btn text-text-muted hover:bg-gray-100 transition-colors cursor-pointer"
                        title={post.status === 'published' ? '隐藏' : '发布'}
                      >
                        {post.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-1.5 rounded-btn text-text-muted hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data?.list.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">暂无帖子</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-divider">
            <span className="text-caption text-text-muted">共 {data.pagination.total} 条</span>
            <div className="flex gap-1">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-btn text-caption font-medium transition-colors cursor-pointer ${
                    p === page ? 'bg-primary text-white' : 'text-text-body hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirmState.open}
        title="删除帖子"
        message="确定要删除这条帖子吗？此操作不可撤销。"
        confirmText="删除"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmState({ open: false, id: '' })}
      />
    </div>
  );
}
