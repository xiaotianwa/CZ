/**
 * 沉浸式路由组 layout
 *
 * 该 route group 用于承载 "全屏沉浸" 类页面（如梗百科立体空间），
 * 不挂载 Navbar / Footer / 水印 / MusicPlayer 等全局装饰，
 * 让页面本体拥有完整视口。
 *
 * 这里额外引入中文手写字体 Ma Shan Zheng（马善政体），供沉浸页的大标题使用。
 * App Router 下直接在 JSX 放 <link>，Next.js 会自动提升到 <head>。
 */
export default function ImmersiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
