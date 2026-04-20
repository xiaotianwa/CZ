'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, Shield, ShieldAlert, ShieldBan,
  Gift, Plus, Trash2, Save,
} from 'lucide-react';

interface PlayerDetail {
  user: {
    id: string; name: string; email: string; avatar: string | null;
    role: string; level: number; points: number; city: string | null; bio: string | null;
    isActive: boolean; createdAt: string;
  };
  player: {
    userId: string;
    rating: number;
    tier: string;
    energy: number;
    wins: number;
    losses: number;
    banStatus: 'normal' | 'warned' | 'banned';
    banUntil: string | null;
    banReason: string | null;
    lastPlayAt: string | null;
  } | null;
  collection: Array<{ cardId: string; count: number; shards: number }>;
  decks: Array<{ id: string; name: string; cardIds: string; isActive: boolean; updatedAt: string }>;
  recentMatches: Array<{
    id: string; mode: string; playerAId: string; playerBId: string | null;
    winnerId: string | null; ratingDelta: number; turns: number; durationSec: number;
    endedReason: string | null; createdAt: string;
  }>;
}

const TIER_LABEL: Record<string, string> = {
  iron: '铁粉', silver: '真爱粉', gold: '超级粉', diamond: '死忠粉', master: '破圈王者',
};

const BAN_META: Record<string, { label: string; cls: string; Icon: typeof Shield }> = {
  normal: { label: '正常', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: Shield },
  warned: { label: '警告中', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: ShieldAlert },
  banned: { label: '已封禁', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', Icon: ShieldBan },
};

export default function TcgPlayerDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = decodeURIComponent(String(params.userId));

  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/tcg/admin/players/${encodeURIComponent(userId)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) {
          setError(json.message || '加载失败');
          if (json.code === 401) router.push('/tcg-admin/login');
          return;
        }
        setDetail(json.data);
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [userId, router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-white/40 text-sm tracking-widest">LOADING · · ·</div>;
  if (error || !detail) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm max-w-xl">
        <AlertCircle className="w-4 h-4" /> {error || '玩家不存在'}
      </div>
    );
  }

  const { user, player, collection, decks, recentMatches } = detail;
  const banMeta = BAN_META[player?.banStatus ?? 'normal'];

  return (
    <div className="space-y-5 max-w-6xl">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <Link href="/tcg-admin/players" className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            {user.name}
          </h2>
          <p className="text-xs text-white/40 font-mono truncate">{user.id} · {user.email}</p>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="社区等级" value={`Lv.${user.level}`} sub={`角色 ${user.role} · 积分 ${user.points}`} />
        <InfoCard label="段位" value={player ? TIER_LABEL[player.tier] || player.tier : '未开战'} sub={player ? `ELO ${player.rating}` : '无档案'} />
        <InfoCard label="战绩" value={player ? `${player.wins} / ${player.losses}` : '0 / 0'} sub="胜 / 负" />
        <InfoCard
          label="状态"
          value={banMeta.label}
          sub={player?.banReason || '—'}
          highlight={player?.banStatus === 'banned' ? 'rose' : player?.banStatus === 'warned' ? 'amber' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BanForm userId={userId} player={player} onUpdated={load} />
        <GrantForm userId={userId} onGranted={load} />
      </div>

      {/* 拥卡 */}
      <Section title={`拥有卡牌（${collection.length} 种）`}>
        {collection.length === 0 ? (
          <p className="text-white/40 text-sm">暂无卡牌</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {collection.map((c) => (
              <div key={c.cardId} className="rounded-lg bg-white/5 border border-white/10 p-2 flex items-center gap-2">
                <div className="text-[11px] font-mono text-[#A78BFA]">{c.cardId}</div>
                <div className="ml-auto text-xs text-white/70">x{c.count}{c.shards > 0 && <span className="text-[10px] text-white/40 ml-1">/{c.shards}碎</span>}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 卡组 */}
      <Section title={`自建卡组（${decks.length}）`}>
        {decks.length === 0 ? (
          <p className="text-white/40 text-sm">暂无卡组</p>
        ) : (
          <div className="space-y-2">
            {decks.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{d.name}</span>
                    {d.isActive && <span className="text-[10px] px-1.5 py-px rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">出战中</span>}
                  </div>
                  <div className="text-[11px] text-white/40">更新 {new Date(d.updatedAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 近 20 场战报 */}
      <Section title={`近期战报（${recentMatches.length}）`}>
        {recentMatches.length === 0 ? (
          <p className="text-white/40 text-sm">暂无战报</p>
        ) : (
          <div className="space-y-1.5">
            {recentMatches.map((m) => {
              const isA = m.playerAId === userId;
              const isWinner = m.winnerId === userId;
              return (
                <Link
                  key={m.id}
                  href={`/tcg-admin/matches/${m.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#A78BFA]/30 transition-colors"
                >
                  <span className={`inline-flex items-center justify-center w-14 text-[11px] font-bold rounded border ${isWinner ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : m.winnerId ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-white/5 text-white/50 border-white/10'}`}>
                    {isWinner ? '胜利' : m.winnerId ? '失败' : '平局'}
                  </span>
                  <span className="text-xs text-white/60 w-16">{m.mode}</span>
                  <span className="text-xs text-white/50">{m.turns} 回合 · {Math.round(m.durationSec / 60)} 分</span>
                  <span className="text-xs text-white/40">{m.endedReason}</span>
                  {isA && (
                    <span className={`text-xs font-mono ml-auto ${m.ratingDelta > 0 ? 'text-emerald-400' : m.ratingDelta < 0 ? 'text-rose-400' : 'text-white/40'}`}>
                      {m.ratingDelta > 0 ? '+' : ''}{m.ratingDelta} ELO
                    </span>
                  )}
                  <span className="text-[11px] text-white/30 w-28 text-right">{new Date(m.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141432]/40 p-5">
      <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40 mb-4">{title}</div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: 'rose' | 'amber' }) {
  const borderCls = highlight === 'rose' ? 'border-rose-500/40' : highlight === 'amber' ? 'border-amber-500/40' : 'border-white/10';
  return (
    <div className={`rounded-xl border ${borderCls} bg-[#141432]/40 p-4`}>
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{label}</div>
      <div className="mt-1 text-lg font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>{value}</div>
      <div className="text-[11px] text-white/40 truncate mt-0.5">{sub}</div>
    </div>
  );
}

// -------------------- 封禁表单 --------------------

function BanForm({ userId, player, onUpdated }: {
  userId: string;
  player: PlayerDetail['player'];
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<'normal' | 'warned' | 'banned'>(player?.banStatus ?? 'normal');
  const [reason, setReason] = useState(player?.banReason ?? '');
  const [untilDays, setUntilDays] = useState(player?.banUntil ? Math.max(1, Math.round((new Date(player.banUntil).getTime() - Date.now()) / 86400000)) : 7);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { banStatus: status };
      payload.banReason = reason || null;
      if (status === 'banned') {
        payload.banUntil = new Date(Date.now() + untilDays * 86400000).toISOString();
      } else {
        payload.banUntil = null;
      }
      const res = await fetch(`/api/tcg/admin/players/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setErr(json.message || '保存失败');
        return;
      }
      onUpdated();
    } catch {
      setErr('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[#141432]/40 p-5 space-y-3">
      <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40">封禁 · 警告</div>

      {err && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> {err}
        </div>
      )}

      <div className="flex gap-2">
        {(['normal', 'warned', 'banned'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-all ${
              status === s
                ? s === 'banned' ? 'bg-rose-500/25 border-rose-500/50 text-rose-200'
                  : s === 'warned' ? 'bg-amber-500/25 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {BAN_META[s].label}
          </button>
        ))}
      </div>

      {status === 'banned' && (
        <div>
          <label className="text-[11px] text-white/60 block mb-1">封禁时长</label>
          <div className="flex gap-1.5">
            {[1, 7, 30, 365].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setUntilDays(d)}
                className={`flex-1 h-8 rounded text-[11px] border transition-colors ${untilDays === d ? 'bg-rose-500/20 border-rose-500/40 text-rose-200' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                {d === 365 ? '永久' : `${d} 天`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] text-white/60 block mb-1">原因（强制审计）</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="如：3 次挂机举报 / 使用脚本刷分 ..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full h-9 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{
          background: status === 'banned'
            ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
            : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
          boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 6px 20px -8px rgba(124,58,237,0.6)',
        }}
      >
        <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}

// -------------------- 补偿发放 --------------------

interface GrantItem {
  type: 'card' | 'shards';
  cardId: string;
  count: number;
}

function GrantForm({ userId, onGranted }: { userId: string; onGranted: () => void }) {
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<GrantItem[]>([{ type: 'card', cardId: '', count: 1 }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const update = (idx: number, key: keyof GrantItem, value: string | number) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };
  const add = () => setItems((arr) => [...arr, { type: 'card', cardId: '', count: 1 }]);
  const remove = (idx: number) => setItems((arr) => arr.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setOk('');
    setSaving(true);
    try {
      const payload = {
        reason,
        items: items.filter((it) => it.cardId).map((it) => ({ type: it.type, cardId: it.cardId.toUpperCase(), count: Number(it.count) })),
      };
      const res = await fetch(`/api/tcg/admin/players/${encodeURIComponent(userId)}/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.code !== 0) { setErr(json.message || '发放失败'); return; }
      setOk(`已发放 ${json.data.granted.length} 项`);
      setItems([{ type: 'card', cardId: '', count: 1 }]);
      setReason('');
      onGranted();
    } catch {
      setErr('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[#141432]/40 p-5 space-y-3">
      <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40">
        <Gift className="w-3.5 h-3.5" /> 补偿发放
      </div>

      {err && <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"><AlertCircle className="w-3.5 h-3.5" /> {err}</div>}
      {ok && <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">{ok}</div>}

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="flex gap-1.5 items-center">
            <select
              value={it.type}
              onChange={(e) => update(idx, 'type', e.target.value as GrantItem['type'])}
              className="h-8 px-2 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#A78BFA]/50"
            >
              <option value="card">卡牌</option>
              <option value="shards">碎片</option>
            </select>
            <input
              value={it.cardId}
              onChange={(e) => update(idx, 'cardId', e.target.value.toUpperCase())}
              placeholder="C01"
              className="flex-1 h-8 px-2 rounded bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs focus:outline-none focus:border-[#A78BFA]/50"
            />
            <input
              type="number"
              min={1}
              value={it.count}
              onChange={(e) => update(idx, 'count', Number(e.target.value))}
              className="w-16 h-8 px-2 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#A78BFA]/50"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={items.length <= 1}
              className="p-1.5 rounded text-white/50 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="text-[11px] text-[#A78BFA] hover:text-white transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> 添加一项
        </button>
      </div>

      <div>
        <label className="text-[11px] text-white/60 block mb-1">发放原因（强制，≥ 4 字）</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="如：连续签到 7 天补偿"
          className="w-full h-8 px-3 rounded bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#A78BFA]/50"
          required
          minLength={4}
        />
      </div>

      <div className="text-[10px] text-white/35">单次限：卡牌 ≤ 10 张 · 碎片 ≤ 500 · 所有发放均写入审计</div>

      <button
        type="submit"
        disabled={saving}
        className="w-full h-9 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{
          background: 'linear-gradient(135deg, #38bdf8 0%, #7c3aed 100%)',
          boxShadow: '0 0 0 1px rgba(56,189,248,0.25), 0 6px 20px -8px rgba(56,189,248,0.6)',
        }}
      >
        <Gift className="w-4 h-4" /> {saving ? '发放中...' : '发放补偿'}
      </button>
    </form>
  );
}
