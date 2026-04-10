import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="glass max-w-md w-full p-8 text-center space-y-4">
        <div className="text-6xl font-bold text-brand">404</div>
        <h2 className="text-xl font-bold text-text-title">页面不存在</h2>
        <p className="text-text-body text-sm">
          你访问的页面已被移除或从未存在过。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
