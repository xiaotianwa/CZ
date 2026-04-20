'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, Play, Pause, Gauge } from 'lucide-react';

interface MatchDetail {
  id: string;
  mode: string;
  seasonId: string | null;
  playerAId: string;
  playerBId: string | null;
  winnerId: string | null;
  ratingDelta: number;
  turns: number;
  durationSec: number;
  endedReason: string | null;
  createdAt: string;
  deckA: unknown;
  deckB: unknown;
  replay: unknown;
  replayRaw: string;
  replayError: string | null;
  playerA: { id: string; name: string; email: string; avatar: string | null } | null;
  playerB: { id: string; name: string; email: string; avatar: string | null } | null;
}

/** replay 数据最简契约：{ actions: Array<{turn, player, action, payload?, ...}> } */
interface ReplayAction {
  turn?: number;
  player?: string;
  action?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export default function TcgMatchDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 回看状态
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    fetch(`/api/tcg/admin/matches/${params.id}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) { setError(json.message || '加载失败'); return; }
        setDetail(json.data);
      })
      .catch(() => setError('网络错误'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // 提取 actions 数组（兼容多种 replay 结构）
  const actions = useMemo<ReplayAction[]>(() => {
    if (!detail?.replay) return [];
    const r = detail.replay as Record<string, unknown>;
    if (Array.isArray(r)) return r as ReplayAction[];
    if (Array.isArray(r.actions)) return r.actions as ReplayAction[];
    if (Array.isArray(r.events)) return r.events as ReplayAction[];
    return [];
  }, [detail]);

  // 自动播放
  useEffect(() => {
    if (!playing) return;
    if (cursor >= actions.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setCursor((c) => Math.min(actions.length - 1, c + 1)), 1000 / speed);
    return () => clearTimeout(t);
  }, [playing, cursor, speed, actions.length]);

  if (loading) return <div className="text-white/40 text-sm tracking-widest">LOADING · · ·</div>;
  if (error || !detail) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm max-w-xl">
        <AlertCircle className="w-4 h-4" /> {error || '战报不存在'}
      </div>
    );
  }

  const winnerSide = detail.winnerId === detail.playerAId ? 'A' : detail.winnerId === detail.playerBId ? 'B' : null;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* 头部 */}
      <div className="flex items-center gap-3">
        <Link href="/tcg-admin/matches" className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>
            战报 · {detail.id.slice(0, 8)}
          </h2>
          <p className="text-xs text-white/40">{new Date(detail.createdAt).toLocaleString('zh-CN')} · 模式 {detail.mode}</p>
        </div>
      </div>

      {/* 双方信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlayerCard side="A" userId={detail.playerAId} name={detail.playerA?.name} email={detail.playerA?.email} isWinner={winnerSide === 'A'} />
        <PlayerCard side="B" userId={detail.playerBId} name={detail.playerB?.name ?? (detail.playerBId ? undefined : 'AI / Boss')} email={detail.playerB?.email} isWinner={winnerSide === 'B'} />
      </div>

      {/* 摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="结束方式" value={detail.endedReason || '—'} />
        <Metric label="回合数" value={detail.turns.toString()} />
        <Metric label="持续" value={`${Math.round(detail.durationSec / 60)} 分 ${detail.durationSec % 60} 秒`} />
        <Metric label="A 玩家 ELO 变化" value={detail.ratingDelta > 0 ? `+${detail.ratingDelta}` : detail.ratingDelta.toString()} />
      </div>

      {/* replay 回看器 */}
      <div className="rounded-xl border border-white/10 bg-[#141432]/40 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/50">REPLAY 回看器</div>
          <div className="ml-auto text-xs text-white/50">
            {actions.length > 0 ? `${cursor + 1} / ${actions.length}` : '无动作'}
          </div>
        </div>

        {detail.replayError && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4" /> replay 解析失败：{detail.replayError}
          </div>
        )}

        {actions.length > 0 ? (
          <>
            {/* 控制条 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setCursor(0)}
                disabled={cursor === 0}
                className="h-8 w-8 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                title="回到开头"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="h-8 px-3 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              >
                上一步
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="h-8 px-4 rounded flex items-center gap-1.5 text-xs font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? '暂停' : '播放'}
              </button>
              <button
                onClick={() => setCursor((c) => Math.min(actions.length - 1, c + 1))}
                disabled={cursor >= actions.length - 1}
                className="h-8 px-3 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              >
                下一步
              </button>
              <button
                onClick={() => setCursor(actions.length - 1)}
                disabled={cursor >= actions.length - 1}
                className="h-8 w-8 rounded bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                title="跳到末尾"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-white/50" />
                {[1, 2, 4, 8].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`h-7 px-2 rounded text-[11px] border transition-colors ${
                      speed === s ? 'bg-[#7C3AED]/25 border-[#7C3AED]/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* 进度条 */}
            <input
              type="range"
              min={0}
              max={actions.length - 1}
              value={cursor}
              onChange={(e) => setCursor(Number(e.target.value))}
              className="w-full accent-[#A78BFA] mb-4"
            />

            {/* 当前动作 */}
            <div className="rounded-lg bg-black/40 border border-[#7C3AED]/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] tracking-wider text-[#A78BFA]">当前动作</span>
                {actions[cursor]?.turn !== undefined && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-white/60">回合 {String(actions[cursor]?.turn)}</span>
                )}
                {actions[cursor]?.player && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#A78BFA]">{String(actions[cursor]?.player)}</span>
                )}
                {actions[cursor]?.action && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">{String(actions[cursor]?.action)}</span>
                )}
              </div>
              <pre className="text-[11px] text-white/70 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {JSON.stringify(actions[cursor], null, 2)}
              </pre>
            </div>
          </>
        ) : (
          <div className="text-sm text-white/45 py-6 text-center">
            战报无 actions 数据（可能是早期版本或空对局）
          </div>
        )}
      </div>

      {/* 卡组快照 & 原始 JSON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DeckSnapshot title="玩家 A 卡组" deck={detail.deckA} />
        <DeckSnapshot title="玩家 B 卡组" deck={detail.deckB} />
      </div>

      <details className="rounded-xl border border-white/10 bg-[#141432]/30 p-4">
        <summary className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40 cursor-pointer hover:text-white">
          原始 replay JSON（展开查看）
        </summary>
        <pre className="mt-3 text-[11px] text-white/50 font-mono whitespace-pre-wrap break-all max-h-80 overflow-y-auto">
          {detail.replayRaw}
        </pre>
      </details>
    </div>
  );
}

function PlayerCard({ side, userId, name, email, isWinner }: {
  side: 'A' | 'B';
  userId: string | null;
  name?: string;
  email?: string;
  isWinner: boolean;
}) {
  const accent = side === 'A' ? 'from-[#7C3AED] to-[#A78BFA]' : 'from-[#F43F5E] to-[#FB7185]';
  const colorCls = side === 'A' ? 'text-[#A78BFA]' : 'text-rose-300';
  const bgCls = side === 'A' ? 'bg-[#7C3AED]/20 border-[#7C3AED]/30' : 'bg-rose-500/20 border-rose-500/30';

  return (
    <div className={`rounded-xl border ${isWinner ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-[#141432]/40'} p-4 relative overflow-hidden`}>
      {isWinner && (
        <div className="absolute top-2 right-2 text-[10px] tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">胜利</div>
      )}
      <div aria-hidden className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-3xl`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${bgCls} border flex items-center justify-center ${colorCls} font-bold text-sm shrink-0`}>
          {name?.[0] ?? side}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{name ?? `Player ${side}`}</div>
          {email && <div className="text-[11px] text-white/40 truncate">{email}</div>}
          {userId && (
            <Link href={`/tcg-admin/players/${encodeURIComponent(userId)}`} className="text-[10px] text-[#A78BFA] hover:text-white font-mono transition-colors">
              {userId.slice(0, 12)} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141432]/30 p-3">
      <div className="text-[10px] tracking-[0.2em] uppercase text-white/40">{label}</div>
      <div className="mt-1 text-base font-bold text-white" style={{ fontFamily: "'Russo One', 'Chakra Petch', sans-serif" }}>{value}</div>
    </div>
  );
}

function DeckSnapshot({ title, deck }: { title: string; deck: unknown }) {
  if (!deck) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#141432]/30 p-4">
        <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40 mb-2">{title}</div>
        <div className="text-xs text-white/40">无卡组数据</div>
      </div>
    );
  }
  const deckArr = Array.isArray(deck) ? deck : (deck as { cards?: unknown[] })?.cards ?? [];
  return (
    <div className="rounded-xl border border-white/10 bg-[#141432]/30 p-4">
      <div className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/40 mb-2">{title}（{Array.isArray(deckArr) ? deckArr.length : 0} 张）</div>
      {Array.isArray(deckArr) && deckArr.length > 0 ? (
        <div className="grid grid-cols-3 gap-1">
          {deckArr.slice(0, 30).map((c, i) => (
            <div key={i} className="text-[11px] font-mono text-white/60 px-2 py-1 rounded bg-white/5 border border-white/5 truncate">
              {typeof c === 'string' ? c : (c as { id?: string })?.id ?? JSON.stringify(c)}
            </div>
          ))}
        </div>
      ) : (
        <pre className="text-[10px] text-white/40 font-mono max-h-32 overflow-y-auto">{JSON.stringify(deck, null, 2)}</pre>
      )}
    </div>
  );
}
