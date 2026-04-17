// 纯 Canvas 卡牌渲染器（零依赖）
// 输出尺寸固定 750×1050（3:4），下载后即可印刷级使用

export type CardType = 'character' | 'item' | 'equipment' | 'effect' | 'event';
export type CardRarity = 'N' | 'R' | 'SR' | 'SSR';

export interface DrawCardData {
  name: string;
  image: HTMLImageElement | null;
  type: CardType;
  rarity: CardRarity;
  cost?: number;
  attack?: number;
  health?: number;
  description?: string;
  flavor?: string;
}

// Hex 版本的配色（与 CardFrame.tsx 视觉一致）
const TYPE_META: Record<CardType, { label: string; icon: string; nameColor: [string, string]; ribbon: string }> = {
  character: { label: '角色', icon: '🎤', nameColor: ['#f472b6', '#fb7185'], ribbon: '#ec4899' },
  item:      { label: '道具', icon: '🥤', nameColor: ['#34d399', '#14b8a6'], ribbon: '#10b981' },
  equipment: { label: '装备', icon: '⚔️', nameColor: ['#22d3ee', '#0284c7'], ribbon: '#0ea5e9' },
  effect:    { label: '消耗', icon: '✨', nameColor: ['#fbbf24', '#f97316'], ribbon: '#f59e0b' },
  event:     { label: '事件', icon: '⚡', nameColor: ['#a78bfa', '#e879f9'], ribbon: '#8b5cf6' },
};

const RARITY_META: Record<CardRarity, { frame: [string, string, string]; glow: string; label: string; ribbonGrad?: [string, string] }> = {
  N:   { frame: ['#94a3b8', '#cbd5e1', '#94a3b8'], glow: 'rgba(148,163,184,0.4)', label: 'N' },
  R:   { frame: ['#38bdf8', '#93c5fd', '#38bdf8'], glow: 'rgba(56,189,248,0.55)', label: 'R' },
  SR:  { frame: ['#d946ef', '#c084fc', '#d946ef'], glow: 'rgba(217,70,239,0.65)', label: 'SR' },
  SSR: { frame: ['#f59e0b', '#fde68a', '#f59e0b'], glow: 'rgba(251,191,36,0.85)', label: 'SSR', ribbonGrad: ['#f59e0b', '#f97316'] },
};

// ========== 工具函数 ==========

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 中文逐字换行
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (ch === '\n') { lines.push(line); line = ''; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// 绘制 cover 模式的图片（类似 object-fit: cover）
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// 属性药丸：图标 + 标签文字 + 数值（明确属性含义）
// anchor: 'left' = 以 (x,y) 为左端对齐； 'right' = 为右端对齐
function drawStatPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: string,
  label: string,
  value: number,
  grad: [string, string],
  anchor: 'left' | 'right' = 'left',
) {
  const h = 56;
  const valueFont = `900 32px system-ui, "PingFang SC", sans-serif`;
  const labelFont = `700 20px system-ui, "PingFang SC", sans-serif`;
  const iconFont = `28px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  // 测量宽度
  ctx.font = iconFont;  const iconW = ctx.measureText(icon).width;
  ctx.font = labelFont; const labelW = ctx.measureText(label).width;
  ctx.font = valueFont; const valueW = ctx.measureText(String(value)).width;
  const padL = 12, gap = 6, padR = 14;
  const w = padL + iconW + gap + labelW + gap + valueW + padR;
  const px = anchor === 'right' ? x - w : x;
  const py = y;
  // 药丸背景（渐变 + 发光）
  const g = ctx.createLinearGradient(px, py, px, py + h);
  g.addColorStop(0, grad[0]);
  g.addColorStop(1, grad[1]);
  ctx.fillStyle = g;
  roundRect(ctx, px, py, w, h, h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // 白色描边
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  roundRect(ctx, px, py, w, h, h / 2);
  ctx.stroke();
  // icon
  let cx = px + padL;
  ctx.font = iconFont;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, cx, py + h / 2);
  cx += iconW + gap;
  // label
  ctx.font = labelFont;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(label, cx, py + h / 2 + 1);
  cx += labelW + gap;
  // value
  ctx.font = valueFont;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(String(value), cx, py + h / 2 + 2);
  ctx.shadowBlur = 0;
}

// ========== 主函数 ==========

export function drawCard(canvas: HTMLCanvasElement, data: DrawCardData) {
  const W = 750;
  const H = 1050;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const typeMeta = TYPE_META[data.type];
  const rarityMeta = RARITY_META[data.rarity];

  // ---- 1. 外层发光（模拟 box-shadow glow）----
  ctx.save();
  ctx.shadowColor = rarityMeta.glow;
  ctx.shadowBlur = 60;
  ctx.fillStyle = rarityMeta.frame[1];
  roundRect(ctx, 20, 20, W - 40, H - 40, 44);
  ctx.fill();
  ctx.restore();

  // ---- 2. 渐变边框 ----
  const frameGrad = ctx.createLinearGradient(0, 0, W, H);
  frameGrad.addColorStop(0, rarityMeta.frame[0]);
  frameGrad.addColorStop(0.5, rarityMeta.frame[1]);
  frameGrad.addColorStop(1, rarityMeta.frame[2]);
  ctx.fillStyle = frameGrad;
  roundRect(ctx, 10, 10, W - 20, H - 20, 40);
  ctx.fill();

  // ---- 3. 内层卡面背景 ----
  const pad = 22;
  const innerX = pad, innerY = pad, innerW = W - pad * 2, innerH = H - pad * 2;
  const bgGrad = ctx.createLinearGradient(0, innerY, 0, innerY + innerH);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  roundRect(ctx, innerX, innerY, innerW, innerH, 30);
  ctx.fill();

  // ---- 4. 主图区（顶部 62%）----
  const artH = Math.round(innerH * 0.62);
  const artY = innerY;
  ctx.save();
  roundRect(ctx, innerX, artY, innerW, artH, 28);
  ctx.clip();
  // 占位底色
  ctx.fillStyle = '#334155';
  ctx.fillRect(innerX, artY, innerW, artH);
  if (data.image && data.image.complete && data.image.naturalWidth > 0) {
    drawCover(ctx, data.image, innerX, artY, innerW, artH);
  } else {
    // ---- 纯文字占位（无素材时） ----
    // 主题色渐变底（半透明）
    const phGrad = ctx.createLinearGradient(innerX, artY, innerX + innerW, artY + artH);
    phGrad.addColorStop(0, typeMeta.nameColor[0] + '33'); // alpha ~20%
    phGrad.addColorStop(1, typeMeta.nameColor[1] + '22');
    ctx.fillStyle = phGrad;
    ctx.fillRect(innerX, artY, innerW, artH);
    // 巨型水印 emoji（10% 透明）
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = '520px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeMeta.icon, innerX + innerW / 2, artY + artH / 2 + 20);
    // 类型小标签
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '700 26px system-ui, "PingFang SC", sans-serif';
    ctx.letterSpacing = '8px' as any;
    ctx.fillText(`${typeMeta.icon}  ${typeMeta.label}`, innerX + innerW / 2, artY + artH / 2 - 110);
    // 大号卡名（主题色渐变）
    const nameText = data.name || '未命名';
    ctx.font = '900 96px system-ui, "PingFang SC", sans-serif';
    const phNameGrad = ctx.createLinearGradient(innerX, 0, innerX + innerW, 0);
    phNameGrad.addColorStop(0, typeMeta.nameColor[0]);
    phNameGrad.addColorStop(1, typeMeta.nameColor[1]);
    ctx.fillStyle = phNameGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    // 自动缩小长名
    let ns = 96;
    while (ns > 44 && ctx.measureText(nameText).width > innerW - 80) {
      ns -= 8;
      ctx.font = `900 ${ns}px system-ui, "PingFang SC", sans-serif`;
    }
    ctx.fillText(nameText, innerX + innerW / 2, artY + artH / 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // 装饰短线
    ctx.fillStyle = typeMeta.ribbon;
    roundRect(ctx, innerX + innerW / 2 - 40, artY + artH / 2 + 70, 80, 4, 2);
    ctx.fill();
  }
  // 底部渐隐
  const fadeGrad = ctx.createLinearGradient(0, artY + artH - 80, 0, artY + artH);
  fadeGrad.addColorStop(0, 'rgba(2,6,23,0)');
  fadeGrad.addColorStop(1, 'rgba(2,6,23,1)');
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(innerX, artY + artH - 80, innerW, 80);
  ctx.restore();

  // ---- 5. 左上 消耗 ----
  if (typeof data.cost === 'number') {
    drawStatPill(ctx, innerX + 16, innerY + 16, '💧', '消耗', data.cost, ['#22d3ee', '#1d4ed8'], 'left');
  }

  // ---- 6. 右上 稀有度徽章 ----
  const badgeW = 90, badgeH = 40;
  const badgeX = innerX + innerW - badgeW - 16, badgeY = innerY + 16;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  badgeGrad.addColorStop(0, rarityMeta.frame[0]);
  badgeGrad.addColorStop(1, rarityMeta.frame[2]);
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '900 24px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rarityMeta.label, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);

  // ---- 7. 类型飘带（主图底部左侧）----
  const ribbonY = artY + artH - 44;
  const ribbonText = `${typeMeta.icon} ${typeMeta.label}`;
  ctx.font = '700 22px system-ui, "PingFang SC", sans-serif';
  const ribbonW = ctx.measureText(ribbonText).width + 28;
  ctx.fillStyle = rarityMeta.ribbonGrad
    ? (() => {
        const g = ctx.createLinearGradient(innerX, 0, innerX + ribbonW, 0);
        g.addColorStop(0, rarityMeta.ribbonGrad![0]);
        g.addColorStop(1, rarityMeta.ribbonGrad![1]);
        return g;
      })()
    : typeMeta.ribbon;
  roundRect(ctx, innerX, ribbonY, ribbonW, 34, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(ribbonText, innerX + 14, ribbonY + 17);

  // ---- 8. 信息区 ----
  const infoY = artY + artH + 16;
  const infoX = innerX + 24;
  const infoW = innerW - 48;

  // 名称（渐变色）
  ctx.font = '900 44px system-ui, "PingFang SC", sans-serif';
  const nameGrad = ctx.createLinearGradient(infoX, infoY, infoX + infoW, infoY);
  nameGrad.addColorStop(0, typeMeta.nameColor[0]);
  nameGrad.addColorStop(1, typeMeta.nameColor[1]);
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(data.name || '未命名', innerX + innerW / 2, infoY + 4);
  ctx.shadowBlur = 0;

  // 分割线
  const divY = infoY + 66;
  const divGrad = ctx.createLinearGradient(infoX, 0, infoX + infoW, 0);
  divGrad.addColorStop(0, 'rgba(255,255,255,0)');
  divGrad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  divGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(infoX, divY, infoW, 2);

  // 描述/效果
  let cursorY = divY + 16;
  if (data.description) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '500 24px system-ui, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lines = wrapText(ctx, data.description, infoW - 20);
    const maxLines = 4;
    lines.slice(0, maxLines).forEach((ln, i) => {
      ctx.fillText(ln, innerX + innerW / 2, cursorY + i * 32);
    });
    cursorY += Math.min(lines.length, maxLines) * 32 + 8;
  }

  // flavor text
  if (data.flavor) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'italic 400 20px system-ui, "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const flines = wrapText(ctx, `「${data.flavor}」`, infoW - 20);
    flines.slice(0, 2).forEach((ln, i) => {
      ctx.fillText(ln, innerX + innerW / 2, cursorY + i * 26);
    });
  }

  // ---- 9. 底部：攻击 / 生命 ----
  const pillH = 56;
  const statY = innerY + innerH - pillH - 14;
  if (typeof data.attack === 'number') {
    drawStatPill(ctx, innerX + 16, statY, '⚔️', '攻击', data.attack, ['#fb7185', '#b91c1c'], 'left');
  }
  if (typeof data.health === 'number') {
    drawStatPill(ctx, innerX + innerW - 16, statY, '❤️', '生命', data.health, ['#34d399', '#047857'], 'right');
  }

  // ---- 10. 1103 Logo 水印（底部居中偏下）----
  ctx.fillStyle = 'rgba(251,191,36,0.55)';
  ctx.font = '900 22px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('1 1 0 3', innerX + innerW / 2, innerY + innerH - 14);

  // ---- 11. SSR 扫光（静态高光条，导出为单帧）----
  if (data.rarity === 'SSR') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(innerX + innerW * 0.25, innerY);
    ctx.rotate((12 * Math.PI) / 180);
    const shine = ctx.createLinearGradient(0, 0, 240, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, -100, 240, innerH + 200);
    ctx.restore();
  }
}

// 将 File 读成 HTMLImageElement
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 将 URL 加载成 HTMLImageElement
export function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
