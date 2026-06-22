import Link from 'next/link';
import { Home, MapPinned, MessageSquare } from 'lucide-react';
import GoBackButton from '@/components/GoBackButton';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4 py-16 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[10%] w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[15%] right-[10%] w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        {/* 404 数字 */}
        <div className="relative inline-block mb-6">
          <span className="font-waterbrush text-[120px] sm:text-[160px] leading-none font-bold text-primary/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl sm:text-6xl font-bold text-text-title tracking-tight">
              4<span className="text-primary">0</span>4
            </span>
          </div>
        </div>

        {/* 标题与描述 */}
        <h2 className="text-xl sm:text-2xl font-bold text-text-title mb-2">
          哎呀，页面走丢了
        </h2>
        <p className="text-text-body text-sm sm:text-base leading-relaxed max-w-sm mx-auto mb-8">
          你要找的页面可能已被移除、更名，或者从未存在过。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-white text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors duration-150 active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <GoBackButton />
        </div>

        {/* 快捷导航 */}
        <div className="border-t border-gray-100 dark:border-white/10 pt-6">
          <p className="text-xs text-text-muted mb-4 uppercase tracking-wider font-medium">也许你想去</p>
          <div className="flex items-center justify-center gap-6">
            <Link href="/feedback" className="group flex flex-col items-center gap-1.5 text-text-muted hover:text-primary transition-colors duration-150">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 group-hover:bg-primary/10 dark:group-hover:bg-primary/10 transition-colors duration-150">
                <MessageSquare className="w-5 h-5" />
              </span>
              <span className="text-xs font-medium">社区</span>
            </Link>
            <Link href="/fan-map" className="group flex flex-col items-center gap-1.5 text-text-muted hover:text-primary transition-colors duration-150">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 group-hover:bg-primary/10 dark:group-hover:bg-primary/10 transition-colors duration-150">
                <MapPinned className="w-5 h-5" />
              </span>
              <span className="text-xs font-medium">粉丝地图</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
