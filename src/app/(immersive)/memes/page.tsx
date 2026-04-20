'use client';

import { useState, useEffect } from 'react';
import MemeSpace, { type MemeItem } from '@/components/memes/MemeSpace';

/**
 * 梗百科 · 立体空间沉浸式页面
 *
 * 隶属 (immersive) 路由组，因此不继承 (main) 的 Navbar/Footer，
 * 整屏完全由 MemeSpace 组件接管。页面本体只负责拉取梗数据，
 * 具体的粒子/卡牌/3D 交互由 MemeSpace 组件承载。
 * 数据尚未返回时组件会先以空数组渲染粒子序列，数据到位后卡牌自动浮现。
 */
export default function MemesPage() {
  const [memes, setMemes] = useState<MemeItem[]>([]);

  useEffect(() => {
    let aborted = false;
    fetch('/api/public/memes')
      .then((r) => r.json())
      .then((res) => { if (!aborted && res?.data) setMemes(res.data as MemeItem[]); })
      .catch(() => { /* 失败时保持空数组；MemeSpace 会显示"暂无内容"占位 */ });
    return () => { aborted = true; };
  }, []);

  return <MemeSpace memes={memes} />;
}
