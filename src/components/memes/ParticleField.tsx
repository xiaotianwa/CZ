'use client';

/**
 * ParticleField — 梗百科全屏立体空间专用粒子场
 *
 * 粒子源：离屏 canvas 上栅格化绘制的多行大字（如 1103 / 陈泽传媒），
 * 按步长采样所有不透明像素作为粒子目标位置，让粒子"组装"成文字剪影。
 *
 * 阶段序列（由外部 phase 控制）：
 *   assembling → 粒子自视口外飞入，组装成文字剪影
 *   idle       → 文字粒子呼吸微动
 *   bursting   → 粒子向外炸开（推进镜头产生"穿越/走近"观感）
 *   ambient    → 只保留少量星尘粒子作为立体空间背景
 *
 * 采用 Canvas 2D + 伪 3D 投影（focal / (focal + z)），在避免 three.js 依赖的前提下
 * 提供足够有空间感的粒子运动。性能目标：3000 粒子稳定 60fps。
 */

import { useEffect, useRef } from 'react';

export type ParticlePhase = 'assembling' | 'idle' | 'bursting' | 'ambient';

interface Particle {
  x: number; y: number; z: number;       // 世界坐标（中心为原点）
  tx: number; ty: number; tz: number;    // 目标坐标（头像组装目标）
  sx: number; sy: number; sz: number;    // 起始坐标（当前阶段开始时的位置）
  vx: number; vy: number; vz: number;    // 爆炸/环境漂浮速度
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;                         // 预缓存的 rgb 字符串
  sparkle: number;                       // 闪烁相位
}

interface Props {
  /** 文字行，每个元素为一行，例如 ['1103', '陈泽传媒'] */
  texts: string[];
  phase: ParticlePhase;
  /** 阶段切换的时间戳（毫秒），用于粒子重置计时 */
  phaseStartedAt: number;
  /**
   * 起点重置版本：外部每次递增此值会强制把所有粒子 sx/sy/sz 重置为屏幕外随机位置，
   * 并把 alpha 归零。用于"从卡牌态返回粒子态"时让粒子重新飞入组装。
   */
  resetVersion?: number;
  /** 采样步长：越小粒子越密，默认 3 */
  sampleStep?: number;
  /** 最大粒子数上限，避免过密，默认 3200 */
  maxParticles?: number;
  className?: string;
  /** 单行字号相对视口高度的比例，默认 0.18（即每行约 vh*18%） */
  textScale?: number;
  /** 多行间距相对字号的倍率，默认 0.15 */
  lineGap?: number;
  /** 字体族，默认优先系统楷体以保证立即可用 */
  fontFamily?: string;
}

const TAU = Math.PI * 2;
const FOCAL_BASE = 820;
const DEFAULT_FONT_FAMILY =
  "'WaterBrush', 'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', 'Hiragino Sans GB', 'Microsoft YaHei', serif";

function clamp255(n: number) {
  return Math.max(0, Math.min(255, n));
}

/**
 * 文字粒子的暖金渐变色：根据粒子在文字矩形中的相对 y 位置做三段渐变，
 * 顶部奶油白 → 中部金黄 → 底部深金，再叠加小幅随机扰动制造颗粒感。
 * relY ∈ [0, 1]（0 表示顶行顶部，1 表示底行底部）
 */
function textParticleColor(relY: number): string {
  const top = [255, 238, 200];
  const mid = [245, 210, 140];
  const bot = [218, 170, 100];
  let r: number, g: number, b: number;
  if (relY < 0.5) {
    const t = relY * 2;
    r = top[0] + (mid[0] - top[0]) * t;
    g = top[1] + (mid[1] - top[1]) * t;
    b = top[2] + (mid[2] - top[2]) * t;
  } else {
    const t = (relY - 0.5) * 2;
    r = mid[0] + (bot[0] - mid[0]) * t;
    g = mid[1] + (bot[1] - mid[1]) * t;
    b = mid[2] + (bot[2] - mid[2]) * t;
  }
  const jitter = (Math.random() - 0.5) * 24;
  return `rgb(${Math.round(clamp255(r + jitter))}, ${Math.round(clamp255(g + jitter))}, ${Math.round(clamp255(b + jitter))})`;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function ParticleField({
  texts,
  phase,
  phaseStartedAt,
  resetVersion = 0,
  sampleStep = 3,
  maxParticles = 3200,
  className,
  textScale = 0.18,
  lineGap = 0.15,
  fontFamily = DEFAULT_FONT_FAMILY,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const centerRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const rafRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const phaseRef = useRef<ParticlePhase>(phase);
  const phaseStartRef = useRef<number>(phaseStartedAt);
  const readyRef = useRef<boolean>(false);

  // phase 或计时变化时同步到 ref；同时重置每个粒子的"起点"字段
  useEffect(() => {
    const prev = phaseRef.current;
    phaseRef.current = phase;
    phaseStartRef.current = phaseStartedAt;

    if (!readyRef.current) return;
    const parts = particlesRef.current;
    // 阶段切换时把当前位置固化为起点 / 生成新的速度
    for (const p of parts) {
      p.sx = p.x; p.sy = p.y; p.sz = p.z;
    }
    if (phase === 'bursting' && prev !== 'bursting') {
      for (const p of parts) {
        // 方向 = 当前世界位置的单位向量（加一点扰动）
        const r = Math.hypot(p.x, p.y) || 1;
        const dirX = p.x / r;
        const dirY = p.y / r;
        const push = 180 + Math.random() * 420;
        p.vx = dirX * push + (Math.random() - 0.5) * 120;
        p.vy = dirY * push + (Math.random() - 0.5) * 120;
        p.vz = (Math.random() - 0.3) * 560; // 偏向正 z（朝向相机）
      }
    }
    if (phase === 'ambient' && prev !== 'ambient') {
      // 为剩余粒子赋予缓慢漂浮速度
      for (const p of parts) {
        p.vx = (Math.random() - 0.5) * 12;
        p.vy = (Math.random() - 0.5) * 12;
        p.vz = (Math.random() - 0.5) * 18;
      }
    }
  }, [phase, phaseStartedAt]);

  // resetVersion 变化时，强制把所有粒子起点放到屏幕外，用于"返回粒子态"时的重新飞入效果。
  // 必须在 phase useEffect 之后运行（因为那里会把 sx = x 固化当前位置），以便覆盖 sx。
  const prevResetVersionRef = useRef<number>(resetVersion);
  useEffect(() => {
    if (prevResetVersionRef.current === resetVersion) return;
    prevResetVersionRef.current = resetVersion;
    if (!readyRef.current) return;
    const parts = particlesRef.current;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    for (const p of parts) {
      const theta = Math.random() * TAU;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;
      const radius = Math.max(vw, vh) * (0.9 + Math.random() * 0.6);
      const nx = Math.cos(theta) * Math.cos(phi) * radius;
      const ny = Math.sin(phi) * radius;
      const nz = Math.sin(theta) * Math.cos(phi) * radius - 300;
      p.sx = nx; p.sy = ny; p.sz = nz;
      p.x = nx; p.y = ny; p.z = nz;
      p.alpha = 0;
    }
  }, [resetVersion]);

  // 文字栅格化 + 像素采样 + 粒子初始化
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initialize = () => {
      if (cancelled) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: vw, h: vh, dpr };
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // 行高、行距、字号均按视口高度等比计算
      const lineH = Math.max(48, vh * textScale);
      const lineStride = lineH * (1 + lineGap);
      const totalH = lineH * texts.length + lineH * lineGap * Math.max(0, texts.length - 1);

      // 离屏画布用于文字栅格化
      const off = document.createElement('canvas');
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;

      // 先按临时画布测量每行宽度，以决定离屏画布尺寸
      octx.font = `bold ${lineH}px ${fontFamily}`;
      const widths = texts.map((t) => octx.measureText(t).width);
      const maxW = Math.max(1, ...widths);
      const padding = Math.ceil(lineH * 0.3);
      const oW = Math.ceil(maxW + padding * 2);
      const oH = Math.ceil(totalH + padding * 2);
      off.width = oW;
      off.height = oH;

      // resize 之后 2d 状态会被重置，需要重新设定字体/对齐/填充
      octx.font = `bold ${lineH}px ${fontFamily}`;
      octx.textAlign = 'center';
      octx.textBaseline = 'top';
      octx.fillStyle = '#ffffff';
      texts.forEach((line, i) => {
        const y = padding + i * lineStride;
        octx.fillText(line, oW / 2, y);
      });

      const data = octx.getImageData(0, 0, oW, oH).data;

      // 步长采样所有不透明像素
      const sampled: Array<{ x: number; y: number; relY: number }> = [];
      const contentH = oH - padding * 2;
      for (let y = 0; y < oH; y += sampleStep) {
        for (let x = 0; x < oW; x += sampleStep) {
          const idx = (y * oW + x) * 4;
          const a = data[idx + 3];
          if (a < 160) continue;
          const relY = contentH > 0 ? Math.min(1, Math.max(0, (y - padding) / contentH)) : 0.5;
          sampled.push({ x, y, relY });
        }
      }

      // 超出上限时均匀抽稀
      let selected = sampled;
      if (sampled.length > maxParticles) {
        const step = sampled.length / maxParticles;
        selected = [];
        for (let i = 0; i < maxParticles; i++) {
          selected.push(sampled[Math.floor(i * step)]);
        }
      }

      // 坐标换算：离屏 canvas → 以视口中心为原点的世界坐标
      const cx = vw / 2;
      const cy = vh * 0.5;
      const particles: Particle[] = selected.map((pt) => {
        const tx = pt.x - oW / 2;
        const ty = pt.y - oH / 2;
        // 起始位置：屏幕外随机方向的大半径球面
        const theta = Math.random() * TAU;
        const phi = (Math.random() - 0.5) * Math.PI * 0.9;
        const radius = Math.max(vw, vh) * (0.9 + Math.random() * 0.6);
        const sx = Math.cos(theta) * Math.cos(phi) * radius;
        const sy = Math.sin(phi) * radius;
        const sz = Math.sin(theta) * Math.cos(phi) * radius - 300;
        const size = 1.2 + Math.random() * 1.4;
        const baseAlpha = 0.75 + Math.random() * 0.25;
        return {
          x: sx, y: sy, z: sz,
          tx, ty, tz: 0,
          sx, sy, sz,
          vx: 0, vy: 0, vz: 0,
          size,
          baseAlpha,
          alpha: 0,
          color: textParticleColor(pt.relY),
          sparkle: Math.random() * TAU,
        };
      });

      particlesRef.current = particles;
      centerRef.current = { cx, cy };
      readyRef.current = true;
    };

    // 尝试等待 Ma Shan Zheng 加载（最长 1.2s），超时后用 fallback 字体立即绘制。
    // 即使超时，后续字体加载完成也不会重新采样 — 用户看到的是当时可用字体的栅格。
    type FontSet = { load: (font: string) => Promise<unknown> };
    const fonts = (typeof document !== 'undefined'
      ? (document as unknown as { fonts?: FontSet }).fonts
      : undefined);
    if (fonts?.load) {
      const probe = `${Math.max(32, window.innerHeight * textScale)}px "Ma Shan Zheng"`;
      Promise.race([
        fonts.load(probe).catch(() => undefined),
        new Promise((r) => setTimeout(r, 1200)),
      ]).then(() => initialize());
    } else {
      initialize();
    }

    return () => { cancelled = true; };
  }, [texts, sampleStep, maxParticles, textScale, lineGap, fontFamily]);

  // 主动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 响应式 resize
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      sizeRef.current = { w: vw, h: vh, dpr };
      centerRef.current = { cx: vw / 2, cy: vh * 0.48 };
    };
    window.addEventListener('resize', onResize);

    let last = performance.now();

    const render = (now: number) => {
      const delta = Math.min(48, now - last);
      last = now;

      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      // 细微的"尘埃"底色渐变，增强纵深
      const g = ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(20, 44, 92, 0.18)');
      g.addColorStop(0.6, 'rgba(6, 12, 28, 0.0)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const parts = particlesRef.current;
      if (!parts || !parts.length) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const { cx, cy } = centerRef.current;

      const phaseNow = phaseRef.current;
      const elapsed = (now - phaseStartRef.current) / 1000; // 秒

      // 阶段特定参数
      let focal = FOCAL_BASE;
      if (phaseNow === 'bursting') {
        // 镜头推进：焦距缩短 → 放大近景
        const t = Math.min(1, elapsed / 1.6);
        focal = FOCAL_BASE - easeInOutQuad(t) * 180;
      } else if (phaseNow === 'ambient') {
        focal = FOCAL_BASE - 180;
      }

      // 批量绘制
      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];

        if (phaseNow === 'assembling') {
          const t = Math.min(1, elapsed / 2.2);
          const e = easeOutCubic(t);
          p.x = p.sx + (p.tx - p.sx) * e;
          p.y = p.sy + (p.ty - p.sy) * e;
          p.z = p.sz + (p.tz - p.sz) * e;
          p.alpha = p.baseAlpha * Math.min(1, t * 1.6);
        } else if (phaseNow === 'idle') {
          // 呼吸 & 微漂浮
          const breath = Math.sin(now / 900 + p.sparkle) * 1.4;
          p.x = p.tx + Math.sin(now / 1200 + p.sparkle * 2) * 1.5;
          p.y = p.ty + breath;
          p.z = p.tz + Math.sin(now / 1600 + p.sparkle) * 6;
          p.alpha = p.baseAlpha * (0.9 + Math.sin(now / 700 + p.sparkle) * 0.1);
        } else if (phaseNow === 'bursting') {
          const t = Math.min(1.2, elapsed / 1.6);
          const e = easeOutCubic(Math.min(1, t));
          p.x = p.sx + p.vx * e * 1.2;
          p.y = p.sy + p.vy * e * 1.2;
          p.z = p.sz + p.vz * e * 1.2;
          p.alpha = p.baseAlpha * Math.max(0, 1 - t * 0.9);
        } else if (phaseNow === 'ambient') {
          // 缓慢漂浮 + 轻微收束在中心球体外环
          p.x += p.vx * (delta / 1000);
          p.y += p.vy * (delta / 1000);
          p.z += p.vz * (delta / 1000);
          // 边界回绕
          const range = 1100;
          if (p.x > range) p.x -= range * 2;
          if (p.x < -range) p.x += range * 2;
          if (p.y > range) p.y -= range * 2;
          if (p.y < -range) p.y += range * 2;
          if (p.z > 500) p.z = -500;
          if (p.z < -700) p.z = 500;
          // 闪烁
          const twinkle = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(now / 600 + p.sparkle));
          p.alpha = p.baseAlpha * 0.35 * twinkle;
          // 只渲染前 1/3 粒子作为背景星尘（性能 + 简洁）
          if (i % 3 !== 0) { p.alpha = 0; }
        }

        if (p.alpha <= 0.005) continue;
        const denom = focal + p.z;
        if (denom <= 1) continue;
        const scale = focal / denom;
        const sx = p.x * scale;
        const sy = p.y * scale;
        const s = p.size * scale;
        if (s < 0.3) continue;

        ctx.globalAlpha = Math.min(1, p.alpha);
        ctx.fillStyle = p.color;
        // 用 rect 代替 arc，性能更好
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}
