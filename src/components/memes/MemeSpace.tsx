'use client';

/**
 * MemeSpace — 梗百科全屏立体空间主编排组件
 *
 * 视图模式（两稳态 + 过渡）：
 *   粒子态 (idle)   → 打开即停留；文字（1103 / 陈泽传媒）由粒子组装保持呼吸
 *   卡牌态 (gallery)→ 3D 球面卡牌空间，可拖拽/缩放/点击详情
 *
 * 切换路径：
 *   idle → bursting → gallery   通过底部"进入梗百科"按钮触发
 *   gallery → idle              通过 HUD"回到粒子"按钮或 ESC；卡牌先 fade-scale 收缩，
 *                               再通过 resetVersion 让粒子从屏幕外重新飞入组装
 *
 * ESC 行为：优先关闭详情弹层 → 卡牌回粒子 → 退出整个沉浸页
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowLeft } from 'lucide-react';
import ParticleField, { type ParticlePhase } from './ParticleField';
import MemeSphere3D from './MemeSphere3D';

export interface MemeItem {
  id: string;
  title: string;
  origin: string;
  description: string;
  example: string | null;
  image: string | null;
  video: string | null;
  tags: string;
  popularity: number;
  createdAt: string;
}

type Stage = 'loading' | 'assembling' | 'idle' | 'bursting' | 'gallery';

function stageToPhase(s: Stage): ParticlePhase {
  if (s === 'assembling' || s === 'loading') return 'assembling';
  if (s === 'idle') return 'idle';
  if (s === 'bursting') return 'bursting';
  return 'ambient';
}



// 模块级常量保证引用稳定，避免每次 render 新建数组导致 ParticleField
// 的 useEffect 重复触发。如需动态文字可从上层传入自己用 useMemo 缓存的数组。
const DEFAULT_PARTICLE_TEXTS: readonly string[] = ['1103', '陈泽传媒'];

export default function MemeSpace({
  memes,
  particleTexts = DEFAULT_PARTICLE_TEXTS,
}: {
  memes: MemeItem[];
  /** 粒子组装的文字行；默认为 ['1103', '陈泽传媒'] */
  particleTexts?: readonly string[];
}) {
  const router = useRouter();

  // 移动端检测（客户端渲染后获取）
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 沉浸式进入：锁定 body 滚动，卸载时恢复
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // ─────── 阶段状态 ───────
  const [stage, setStage] = useState<Stage>('loading');
  const [stageStartedAt, setStageStartedAt] = useState<number>(() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  // 为粒子组件提供稳定的 phase/时间（避免每次 setState 引发多次重建）
  const phase = stageToPhase(stage);

  // 阶段推进：只自动完成首次组装（loading → assembling → idle），
  // idle 后不再自动推进。进入 / 返回卡牌空间改由用户主动触发，
  // 通过 enterGallery / backToParticles 推进 bursting → gallery → assembling → idle。
  useEffect(() => {
    if (stage === 'loading') {
      const t = setTimeout(() => {
        setStage('assembling');
        setStageStartedAt(performance.now());
      }, 160);
      return () => clearTimeout(t);
    }
    if (stage === 'assembling') {
      const t = setTimeout(() => {
        setStage('idle');
        setStageStartedAt(performance.now());
      }, 1600);
      return () => clearTimeout(t);
    }
    if (stage === 'bursting') {
      const t = setTimeout(() => {
        setStage('gallery');
        setStageStartedAt(performance.now());
      }, 1200);
      return () => clearTimeout(t);
    }
    // idle 与 gallery 是稳态，不设定时器；等待用户操作触发切换
  }, [stage]);

  // ─────── 视图切换（粒子 ↔ 卡牌空间）───────
  const [resetVersion, setResetVersion] = useState(0);      // 驱动 ParticleField 重置起点
  const [isReturning, setIsReturning] = useState(false);    // gallery → particle 过渡中
  const returningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enterGallery = () => {
    if (stage !== 'idle') return;
    setStage('bursting');
    setStageStartedAt(performance.now());
  };

  const backToParticles = () => {
    if (stage !== 'gallery' || isReturning) return;
    setIsReturning(true);
    // 先让卡牌在当前位置做 fade/scale 收缩 500ms，再切到 assembling 让粒子重新飞入
    returningTimerRef.current = setTimeout(() => {
      setResetVersion((v) => v + 1);
      setStage('assembling');
      setStageStartedAt(performance.now());
      setIsReturning(false);
      returningTimerRef.current = null;
    }, 500);
  };

  // 卸载时清理计时器
  useEffect(() => () => {
    if (returningTimerRef.current) clearTimeout(returningTimerRef.current);
  }, []);

  // ─────── 搜索 ───────
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return memes;
    return memes.filter((m) =>
      m.title.toLowerCase().includes(q)
      || m.description.toLowerCase().includes(q)
      || m.origin.toLowerCase().includes(q)
    );
  }, [memes, searchQuery]);

  // ─────── 滚轮交互（idle → gallery 切换）───────
  // gallery 内的缩放由 Three.js TrackballControls 管理，这里只处理 idle → gallery
  const wheelAccumRef = useRef(0);
  const wheelResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const WHEEL_THRESHOLD = 220;

  useEffect(() => {
    const scheduleReset = () => {
      if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
      wheelResetRef.current = setTimeout(() => { wheelAccumRef.current = 0; }, 400);
    };

    const onWheel = (e: WheelEvent) => {
      if (stage === 'loading' || stage === 'assembling' || stage === 'bursting' || isReturning) return;

      if (stage === 'idle') {
        e.preventDefault();
        if (e.deltaY < 0) {
          wheelAccumRef.current += Math.abs(e.deltaY);
          if (wheelAccumRef.current >= WHEEL_THRESHOLD) {
            wheelAccumRef.current = 0;
            enterGallery();
          }
          scheduleReset();
        } else {
          wheelAccumRef.current = Math.max(0, wheelAccumRef.current - Math.abs(e.deltaY) * 0.5);
        }
      }
      // gallery 阶段：滚轮事件交给 Three.js TrackballControls 处理（不 preventDefault）
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelResetRef.current) clearTimeout(wheelResetRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isReturning]);

  // ─────── 详情弹层 ───────
  const [activeMemeId, setActiveMemeId] = useState<string | null>(null);
  const activeMeme = useMemo(() => memes.find((m) => m.id === activeMemeId) || null, [memes, activeMemeId]);

  // ESC 优先级：关闭详情 > 卡牌→粒子 > 退出站点
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeMemeId) {
        setActiveMemeId(null);
      } else if (stage === 'gallery' && !isReturning) {
        backToParticles();
      } else {
        router.back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMemeId, stage, isReturning, router]);

  // ─────── 渲染 ───────
  const showTitle = stage === 'idle' || stage === 'assembling';
  const showGallery = stage === 'gallery';

  return (
    <div
      className="meme-space-root fixed inset-0 z-[70] overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 18%, rgba(255,232,196,0.16) 0%, rgba(255,232,196,0.05) 16%, rgba(5,11,24,0) 34%), radial-gradient(circle at 20% 24%, rgba(255,244,225,0.08) 0%, rgba(255,244,225,0.02) 18%, rgba(5,11,24,0) 34%), radial-gradient(circle at 82% 22%, rgba(250,226,188,0.08) 0%, rgba(250,226,188,0.02) 16%, rgba(5,11,24,0) 34%), linear-gradient(180deg, #08111f 0%, #0b1628 38%, #091321 68%, #050a14 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[10%] top-[14%] h-[18rem] w-[28rem] rounded-full bg-[rgba(255,244,223,0.08)] blur-[110px]" />
        <div className="absolute right-[6%] top-[20%] h-[16rem] w-[24rem] rounded-full bg-[rgba(255,231,197,0.07)] blur-[100px]" />
        <div className="absolute left-1/2 top-[58%] h-[18rem] w-[40rem] -translate-x-1/2 rounded-full bg-[rgba(180,205,232,0.08)] blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[linear-gradient(180deg,rgba(255,247,234,0.08),rgba(255,247,234,0.02),rgba(255,247,234,0))]" />
      </div>

      {/* ─── 粒子层 ─── */}
      <div className="absolute inset-0 pointer-events-none">
        <ParticleField
          texts={particleTexts as string[]}
          phase={phase}
          phaseStartedAt={stageStartedAt}
          resetVersion={resetVersion}
          textScale={isMobile ? 0.1 : 0.2}
          lineGap={isMobile ? 0.12 : 0.18}
          maxParticles={isMobile ? 1800 : 3000}
          sampleStep={isMobile ? 4 : 3}
        />
      </div>

      {/* ─── 顶部栏目标识：始终显示 ─── */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-5 sm:top-6 text-center z-10">
        <div
          className="font-waterbrush text-[rgba(255,245,227,0.78)] text-[16px] sm:text-[18px] leading-none tracking-[0.35em]"
          style={{
            fontWeight: 400,
            textShadow: '0 6px 18px rgba(6,12,24,0.45)',
          }}
        >
          1103 梗百科
        </div>
      </div>

      {/* ─── idle 阶段中心下方的“进入梗百科”触发按钮 ─── */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-[14%] transition-all duration-500 ease-out ${
          stage === 'idle' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <button
          onClick={enterGallery}
          className="group inline-flex items-center gap-2 h-11 px-6 rounded-full border border-[rgba(255,244,224,0.22)] bg-[rgba(255,248,237,0.08)] backdrop-blur-xl text-[rgba(255,243,220,0.92)] text-[14px] tracking-[0.1em] hover:bg-[rgba(255,248,237,0.14)] hover:border-[rgba(255,244,224,0.38)] transition-all duration-200"
          style={{ boxShadow: '0 16px 50px rgba(7,12,24,0.28), inset 0 1px 0 rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4" />
          <span>进入梗百科</span>
          <span className="text-white/38 text-[11px] ml-1">放大 →</span>
        </button>
      </div>

      {/* ─── 3D 卡牌球面（gallery 阶段）—— Three.js CSS3DRenderer ─── */}
      {showGallery && (
        <MemeSphere3D
          memes={filtered}
          onSelect={setActiveMemeId}
          onZoomOut={backToParticles}
          isReturning={isReturning}
        />
      )}

      {/* ─── HUD：顶部搜索栏（gallery 阶段显示） ─── */}
      <div
        className={`absolute left-0 right-0 top-0 z-20 pointer-events-none transition-all duration-500 ${
          showGallery ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
        }`}
      >
        <div
          className="pointer-events-auto flex items-center justify-between gap-2 px-3 sm:px-6 pt-3 sm:pt-5 pb-4 sm:pb-6"
          style={{
            paddingTop: `max(12px, env(safe-area-inset-top, 12px))`,
            background: 'linear-gradient(180deg, rgba(8,14,28,0.85) 0%, rgba(8,14,28,0.5) 60%, transparent 100%)',
          }}
        >
          {/* 返回上一页 */}
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] backdrop-blur-xl text-[rgba(248,250,255,0.82)] text-[13px] hover:bg-[rgba(255,255,255,0.12)] hover:text-white transition-colors shrink-0"
            aria-label="返回上一页"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回</span>
          </button>

          {/* 搜索 */}
          <div className="flex flex-1 max-w-xl min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                type="text"
                placeholder="搜索梗名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 sm:h-9 pl-8 sm:pl-9 pr-3 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.14)] backdrop-blur-xl text-[rgba(248,250,255,0.96)] text-[12px] sm:text-[13px] placeholder:text-white/32 focus:outline-none focus:border-[rgba(255,239,210,0.38)] focus:bg-[rgba(255,255,255,0.11)] transition-colors"
              />
            </div>
          </div>

          {/* 占位，让搜索居中 */}
          <div className="w-9 sm:w-[60px] shrink-0" />
        </div>

      </div>

      {/* 底部计数栏已移除 */}

      {/* ─── 详情弹层 ─── */}
      {activeMeme && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in-up"
          onClick={() => setActiveMemeId(null)}
          style={{ animationDuration: '240ms' }}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(20,30,52,0.96),rgba(10,16,30,0.94))] shadow-2xl self-end sm:self-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveMemeId(null)}
              className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 图片 */}
            {activeMeme.image && (
              <div className="w-full">
                <img
                  src={activeMeme.image}
                  alt={activeMeme.title}
                  className="w-full h-auto max-h-[320px] object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* 视频 */}
            {activeMeme.video && (
              <div className="w-full aspect-video">
                <video
                  src={activeMeme.video}
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              </div>
            )}

            <div className="p-4 sm:p-6">
              {/* 标题 + 时间 */}
              <h2 className="text-white text-[18px] sm:text-[22px] font-bold mb-1">{activeMeme.title}</h2>
              <p className="text-white/40 text-[11px] sm:text-[12px] mb-3 sm:mb-4">
                {new Date(activeMeme.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              {/* 详细描述 */}
              <div>
                <div className="text-[11px] tracking-[0.2em] text-[rgba(255,230,192,0.84)] mb-1.5">DETAIL · 详细</div>
                <p className="text-white/85 text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap">{activeMeme.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
