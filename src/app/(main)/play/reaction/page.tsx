'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, RotateCcw, Trophy } from 'lucide-react';

type Phase = 'ready' | 'waiting' | 'go' | 'result' | 'too-early' | 'done';

export default function ReactionPage() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const goTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalRounds = 5;

  const startRound = useCallback(() => {
    setPhase('waiting');
    // 随机延迟 1~4 秒后变绿
    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      goTimeRef.current = Date.now();
      setPhase('go');
    }, delay);
  }, []);

  const startGame = useCallback(() => {
    setResults([]);
    setRound(0);
    setReactionTime(0);
    startRound();
  }, [startRound]);

  const handleClick = () => {
    if (phase === 'ready') {
      startGame();
      return;
    }

    if (phase === 'waiting') {
      // 点太早了
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase('too-early');
      return;
    }

    if (phase === 'go') {
      const time = Date.now() - goTimeRef.current;
      setReactionTime(time);
      const newResults = [...results, time];
      setResults(newResults);
      const newRound = round + 1;
      setRound(newRound);

      if (newRound >= totalRounds) {
        setPhase('done');
      } else {
        setPhase('result');
      }
      return;
    }

    if (phase === 'too-early') {
      startRound();
      return;
    }

    if (phase === 'result') {
      startRound();
      return;
    }
  };

  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const best = results.length > 0 ? Math.min(...results) : 0;

  const getTimeColor = (ms: number) => {
    if (ms < 200) return 'text-emerald-500';
    if (ms < 300) return 'text-sky-500';
    if (ms < 400) return 'text-amber-500';
    return 'text-red-500';
  };

  const getTimeRating = (ms: number) => {
    if (ms < 200) return '⚡ 闪电反应！';
    if (ms < 250) return '🔥 非常快！';
    if (ms < 300) return '😎 不错！';
    if (ms < 400) return '🙂 一般般';
    return '🐢 有点慢哦';
  };

  return (
    <div className="pb-16 mt-14">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.5)_3px,rgba(255,255,255,0.5)_4px)]" />
        <div className="container-main px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <Link href="/play" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回游戏大厅
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">反应速度测试</h1>
              <p className="text-sm text-white/70 mt-0.5">看到绿色信号立刻点击！</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 -mt-4 relative z-20 max-w-lg mx-auto">
        {/* 主交互区 */}
        {phase !== 'done' && (
          <div
            onClick={handleClick}
            className={`rounded-2xl shadow-lg p-8 sm:p-12 text-center cursor-pointer select-none transition-all duration-200 min-h-[300px] flex flex-col items-center justify-center ${
              phase === 'ready'
                ? 'bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333]'
                : phase === 'waiting'
                ? 'bg-red-500 border border-red-600'
                : phase === 'go'
                ? 'bg-emerald-500 border border-emerald-600 active:scale-[0.98]'
                : phase === 'too-early'
                ? 'bg-amber-500 border border-amber-600'
                : 'bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333]'
            }`}
          >
            {phase === 'ready' && (
              <>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-text-title dark:text-white">反应速度测试</h2>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  共 {totalRounds} 轮，等屏幕变<span className="text-emerald-500 font-bold">绿色</span>后立刻点击
                  <br />点太早会判无效哦！
                </p>
                <div className="mt-6 text-base font-bold text-primary">点击任意处开始</div>
              </>
            )}

            {phase === 'waiting' && (
              <>
                <div className="text-5xl mb-4">🔴</div>
                <h2 className="text-2xl font-bold text-white">等待...</h2>
                <p className="text-white/80 mt-2">变绿后再点击！</p>
                {round > 0 && (
                  <p className="text-white/60 text-sm mt-4">第 {round + 1} / {totalRounds} 轮</p>
                )}
              </>
            )}

            {phase === 'go' && (
              <>
                <div className="text-5xl mb-4">🟢</div>
                <h2 className="text-3xl font-bold text-white">点击！</h2>
                <p className="text-white/80 mt-2 text-lg">快快快！</p>
              </>
            )}

            {phase === 'too-early' && (
              <>
                <div className="text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white">太早了！</h2>
                <p className="text-white/80 mt-2">等到变绿再点击哦</p>
                <p className="text-white/60 text-sm mt-4">点击重试本轮</p>
              </>
            )}

            {phase === 'result' && (
              <>
                <div className={`text-5xl font-bold ${getTimeColor(reactionTime)} mb-2`}>
                  {reactionTime} ms
                </div>
                <p className="text-lg font-medium text-text-title dark:text-white">{getTimeRating(reactionTime)}</p>
                <p className="text-text-muted text-sm mt-3">
                  第 {round} / {totalRounds} 轮 · 点击继续
                </p>
                {/* 小结果条 */}
                <div className="flex items-center gap-2 mt-4">
                  {results.map((r, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${
                      r < 250 ? 'bg-emerald-500' : r < 350 ? 'bg-sky-500' : 'bg-amber-500'
                    }`}>
                      {r}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Done - 总结果 */}
        {phase === 'done' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-text-title dark:text-white">测试完成！</h2>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className={`text-3xl font-bold ${getTimeColor(avg)}`}>{avg}</div>
                <div className="text-xs text-text-muted mt-1">平均 (ms)</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className={`text-3xl font-bold ${getTimeColor(best)}`}>{best}</div>
                <div className="text-xs text-text-muted mt-1">最快 (ms)</div>
              </div>
            </div>

            {/* 每轮详情 */}
            <div className="mt-5 space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5">
                  <span className="text-sm text-text-muted">第 {i + 1} 轮</span>
                  <span className={`text-sm font-bold ${getTimeColor(r)}`}>{r} ms</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4">
              <p className="text-sm font-medium text-primary">
                {avg < 200
                  ? '⚡ 闪电手速！职业选手级别！'
                  : avg < 280
                  ? '🔥 反应很快，手速在线！'
                  : avg < 350
                  ? '😊 正常水平，多练练会更好！'
                  : '🐢 反应稍慢，不过练习能提高！'}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-600 text-white font-bold hover:from-yellow-300 hover:to-orange-500 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 再来一次
              </button>
              <Link
                href="/play"
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full border-2 border-gray-200 dark:border-[#333] text-text-body dark:text-white/80 font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                返回大厅
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
