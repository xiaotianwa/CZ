'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, GripVertical, Play, Pause, Music, Upload, Loader2, Pencil, X, Check, Eye, EyeOff } from 'lucide-react';
import { adminGet, adminPost, adminPut, adminDelete, adminUpload } from '@/lib/admin-fetch';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Toast from '@/components/admin/Toast';
import ImageUpload from '@/components/admin/ImageUpload';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover: string | null;
  duration: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

function formatDuration(s: number | null): string {
  if (!s) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AdminMusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', cover: '' });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [toast, setToast] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
  };

  const fetchTracks = useCallback(async () => {
    try {
      const res = await adminGet<Track[]>('/api/admin/music');
      setTracks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    const isAudio = file.type.startsWith('audio/');
    if (!isAudio) {
      showToast('请选择音频文件（MP3、WAV、OGG 等）', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('文件大小不能超过 50MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const result = await adminUpload(file, 'music');
      const title = file.name.replace(/\.[^.]+$/, '');

      await adminPost('/api/admin/music', {
        title,
        artist: '陈泽',
        src: result.url,
      });

      showToast('上传成功');
      fetchTracks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDelete(`/api/admin/music?id=${id}`);
      showToast('删除成功');
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      fetchTracks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error');
    }
  };

  const handleToggleActive = async (track: Track) => {
    try {
      await adminPut('/api/admin/music', { id: track.id, isActive: !track.isActive });
      fetchTracks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error');
    }
  };

  const startEdit = (track: Track) => {
    setEditingId(track.id);
    setEditForm({ title: track.title, artist: track.artist, cover: track.cover || '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await adminPut('/api/admin/music', { id: editingId, ...editForm });
      showToast('保存成功');
      setEditingId(null);
      fetchTracks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error');
    }
  };

  const moveTrack = async (id: string, direction: 'up' | 'down') => {
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tracks.length) return;

    try {
      await Promise.all([
        adminPut('/api/admin/music', { id: tracks[idx].id, sortOrder: tracks[swapIdx].sortOrder }),
        adminPut('/api/admin/music', { id: tracks[swapIdx].id, sortOrder: tracks[idx].sortOrder }),
      ]);
      fetchTracks();
    } catch (err) {
      showToast('排序失败', 'error');
    }
  };

  const togglePlay = (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = track.src;
      audio.play().catch(() => {});
      setPlayingId(track.id);
    }
  };

  return (
    <div className="max-w-4xl">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-heading text-text-title">音乐管理</h2>
          <p className="text-caption text-text-muted mt-0.5">管理前台唱片机播放列表，支持上传音频至 COS</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 上传中...</>
            ) : (
              <><Plus className="w-4 h-4" /> 上传音乐</>
            )}
          </button>
        </div>
      </div>

      {/* Track List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
        </div>
      ) : tracks.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Music className="w-12 h-12 text-text-disabled mb-3" />
          <p className="text-body text-text-muted">还没有音乐</p>
          <p className="text-caption text-text-disabled mt-1">点击上方按钮上传第一首歌曲</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-4 bg-white rounded-card border border-divider shadow-sm transition-all ${
                !track.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Sort Handle */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveTrack(track.id, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 text-text-disabled hover:text-text-body disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <GripVertical className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => moveTrack(track.id, 'down')}
                  disabled={idx === tracks.length - 1}
                  className="p-0.5 text-text-disabled hover:text-text-body disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Play Button */}
              <button
                onClick={() => togglePlay(track)}
                className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 hover:bg-gray-800 cursor-pointer transition-colors"
              >
                {playingId === track.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                {editingId === track.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="h-8 px-2 border border-border rounded-btn text-body flex-1 min-w-0"
                        placeholder="歌曲名称"
                      />
                      <input
                        value={editForm.artist}
                        onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                        className="h-8 px-2 border border-border rounded-btn text-body w-24"
                        placeholder="艺术家"
                      />
                      <button onClick={saveEdit} className="p-1.5 text-success hover:bg-green-50 rounded-btn cursor-pointer">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-text-muted hover:bg-gray-50 rounded-btn cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-20">
                      <ImageUpload
                        value={editForm.cover}
                        onChange={(url) => setEditForm({ ...editForm, cover: url })}
                        category="music"
                        label="封面"
                        aspect="aspect-square"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-body font-medium text-text-title truncate">{track.title}</p>
                    <p className="text-caption text-text-muted">{track.artist} · {formatDuration(track.duration)}</p>
                  </>
                )}
              </div>

              {/* Actions */}
              {editingId !== track.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(track)}
                    className={`p-1.5 rounded-btn cursor-pointer transition-colors ${
                      track.isActive ? 'text-text-muted hover:bg-gray-50' : 'text-text-disabled hover:bg-gray-50'
                    }`}
                    title={track.isActive ? '隐藏' : '显示'}
                  >
                    {track.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => startEdit(track)}
                    className="p-1.5 text-text-muted hover:bg-gray-50 rounded-btn cursor-pointer"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmState({ open: true, id: track.id })}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-red-50 rounded-btn cursor-pointer"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title="删除音乐"
        message="确定要删除这首音乐吗？此操作不可撤销。"
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
