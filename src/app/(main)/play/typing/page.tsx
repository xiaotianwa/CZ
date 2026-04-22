'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Keyboard, RotateCcw, Trophy, Timer, Zap, Target } from 'lucide-react';

// 弹幕/金句素材库（兜底）
const FALLBACK_SENTENCES = [
  '兄弟们把一切交给我',
  '这把稳了兄弟们',
  '我陈泽没有输过',
  '不要慌问题不大',
  '这个操作可以的',
  '秀啊兄弟秀啊',
  '老铁们双击关注一下',
  '感谢榜一大哥',
  '来了来了他来了',
  '这个必须安排上',
  '我直接一个起飞',
  '有没有人看我直播',
  '家人们谁懂啊',
  '好好好这很合理',
  '啊这也太离谱了',
  '兄弟们冲冲冲',
  '芜湖起飞咯',
  '这波操作六六六',
  '整活整活赶紧整活',
  '经典永流传',
  '直播间的老铁们',
  '这个游戏真好玩',
  '今天也是元气满满的一天',
  '你们觉得怎么样',
  '下次一定下次一定',
  '我宣布这很重要',
  '格局打开格局打开',
  '咱就是说这谁顶得住',
  '绝了这真的绝了',
  '我佛了我真的佛了',
];

// 从游戏子模块独立数据源加载词库
let _cachedSentences: string[] | null = null;
async function loadSentences(): Promise<string[]> {
  if (_cachedSentences) return _cachedSentences;
  try {
    const res = await fetch('/api/public/game/typing-sentences');
    const json = await res.json();
    if (json.code === 0 && json.data && json.data.length > 0) {
      _cachedSentences = (json.data as Array<{ content: string }>).map((s) => s.content);
      return _cachedSentences;
    }
  } catch { /* fallback */ }
  return FALLBACK_SENTENCES;
}

type Phase = 'ready' | 'playing' | 'result';

interface TypedChar {
  char: string;
  correct: boolean;
}

export default function TypingPage() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [typedChars, setTypedChars] = useState<TypedChar[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [completedSentences, setCompletedSentences] = useState(0);
  const [duration] = useState(60); // 60 秒
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSentence = sentences[currentSentenceIdx] || '';

  const shuffleSentences = useCallback(async () => {
    const all = await loadSentences();
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setSentences(shuffled);
  }, []);

  const startGame = useCallback(async () => {
    await shuffleSentences();
    setCurrentSentenceIdx(0);
    setTypedChars([]);
    setTotalCorrect(0);
    setTotalTyped(0);
    setCompletedSentences(0);
    setElapsed(0);
    setPhase('playing');
    const now = Date.now();
    setStartTime(now);

    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - now) / 1000);
      setElapsed(e);
      if (e >= 60) {
        setPhase('result');
      }
    }, 200);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [shuffleSentences]);

  // 清理 timer
  useEffect(() => {
    if (phase === 'result' && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== 'playing') return;

    const val = e.target.value;
    const chars: TypedChar[] = [];
    let correct = 0;

    for (let i = 0; i < val.length; i++) {
      const expected = currentSentence[i] || '';
      const isCorrect = val[i] === expected;
      chars.push({ char: val[i], correct: isCorrect });
      if (isCorrect) correct++;
    }

    setTypedChars(chars);

    // 当前句子打完
    if (val.length >= currentSentence.length) {
      setTotalCorrect((prev) => prev + correct);
      setTotalTyped((prev) => prev + val.length);
      setCompletedSentences((prev) => prev + 1);

      // 下一句
      const nextIdx = currentSentenceIdx + 1;
      if (nextIdx < sentences.length) {
        setCurrentSentenceIdx(nextIdx);
        setTypedChars([]);
        e.target.value = '';
      } else {
        // 所有句子打完，重新洗牌
        shuffleSentences();
        setCurrentSentenceIdx(0);
        setTypedChars([]);
        e.target.value = '';
      }
    }
  };

  const timeLeft = Math.max(0, duration - elapsed);
  const wpm = elapsed > 0 ? Math.round((totalCorrect / elapsed) * 60) : 0; // 字/分钟
  const accuracy = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

  return (
    <div className="pb-16 mt-14">
      {/* Header */}
      <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.5)_3px,rgba(255,255,255,0.5)_4px)]" />
        <div className="container-main px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <Link href="/play" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> 返回游戏大厅
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Keyboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">弹幕打字赛</h1>
              <p className="text-sm text-white/70 mt-0.5">60 秒内打出尽可能多的弹幕金句</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-main px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        {/* Ready */}
        {phase === 'ready' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Keyboard className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-text-title dark:text-white">弹幕打字赛</h2>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              在 <strong className="text-text-title dark:text-white">60 秒</strong> 内尽可能快速准确地打出弹幕金句
              <br />系统会实时统计你的速度和准确率
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-text-muted">
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-sky-500" />
                <span>60 秒</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>多句挑战</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                <span>准确率</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="mt-8 h-12 px-8 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-base hover:from-sky-400 hover:to-indigo-500 transition-all active:scale-[0.97] shadow-lg cursor-pointer"
            >
              开始挑战
            </button>
          </div>
        )}

        {/* Playing */}
        {phase === 'playing' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* 状态栏 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{wpm}</div>
                    <div className="text-[10px] text-text-muted uppercase">字/分</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
                  <div className="text-center">
                    <div className={`text-lg font-bold ${accuracy >= 90 ? 'text-emerald-500' : accuracy >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{accuracy}%</div>
                    <div className="text-[10px] text-text-muted uppercase">准确率</div>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
                  <div className="text-center">
                    <div className="text-lg font-bold text-text-title dark:text-white">{completedSentences}</div>
                    <div className="text-[10px] text-text-muted uppercase">完成句</div>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                  timeLeft <= 10 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                }`}>
                  <Timer className="w-4 h-4" />
                  {timeLeft}s
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    timeLeft <= 10 ? 'bg-red-500' : 'bg-gradient-to-r from-sky-500 to-indigo-600'
                  }`}
                  style={{ width: `${(timeLeft / duration) * 100}%` }}
                />
              </div>
            </div>

            {/* 打字区 */}
            <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-6 sm:p-8">
              {/* 当前句子展示 */}
              <div className="text-xl sm:text-2xl font-bold leading-loose tracking-wider mb-6 select-none">
                {currentSentence.split('').map((char, i) => {
                  const typed = typedChars[i];
                  let color = 'text-gray-300 dark:text-white/30';
                  if (typed) {
                    color = typed.correct ? 'text-emerald-500' : 'text-red-500 underline decoration-red-500';
                  } else if (i === typedChars.length) {
                    color = 'text-text-title dark:text-white bg-primary/10 rounded px-0.5';
                  }
                  return (
                    <span key={i} className={`${color} transition-colors duration-100`}>{char}</span>
                  );
                })}
              </div>

              {/* 输入框 */}
              <input
                ref={inputRef}
                type="text"
                onChange={handleInput}
                className="w-full h-14 px-5 rounded-xl border-2 border-sky-300 dark:border-sky-500/50 bg-sky-50/50 dark:bg-sky-500/5 text-lg font-medium text-text-title dark:text-white placeholder-text-muted/50 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition-colors"
                placeholder="在这里打字..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <p className="text-xs text-text-muted mt-2 text-center">
                打完当前句子会自动切换到下一句
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e22] border border-white/70 dark:border-[#333] shadow-lg p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-text-title dark:text-white">时间到！</h2>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-primary">{wpm}</div>
                <div className="text-xs text-text-muted mt-1">字/分钟</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className={`text-2xl font-bold ${accuracy >= 90 ? 'text-emerald-500' : accuracy >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{accuracy}%</div>
                <div className="text-xs text-text-muted mt-1">准确率</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <div className="text-2xl font-bold text-sky-500">{completedSentences}</div>
                <div className="text-xs text-text-muted mt-1">完成句数</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4">
              <p className="text-sm font-medium text-primary">
                {wpm >= 100
                  ? '🏆 打字大师！你的手速堪比弹幕收割机！'
                  : wpm >= 60
                  ? '🔥 不错的速度，老铁手速在线！'
                  : wpm >= 30
                  ? '😊 还行，多练练会更快！'
                  : '🐢 慢慢来，打字也是一种修行~'}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={startGame}
                className="inline-flex items-center gap-1.5 h-11 px-6 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold hover:from-sky-400 hover:to-indigo-500 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 再来一局
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
