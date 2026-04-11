'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Gamepad2, X } from 'lucide-react';

const termsContent = {
  title: '用户协议',
  sections: [
    {
      heading: '一、协议范围',
      content: '本协议是您与1103社区（以下简称“本社区”）之间关于使用社区服务的法律协议。您注册成为本社区用户即表示接受本协议的全部条款。',
    },
    {
      heading: '二、账号注册与安全',
      content: '您需提供有效的邮箱地址进行注册，并对账号下的所有活动负责。请妥善保管您的密码，不得将账号转让、出借或出租给他人。如发现账号被盗用，请立即联系我们。',
    },
    {
      heading: '三、社区行为规范',
      content: '您在社区发布的内容应遵守国家法律法规，不得发布违法违规、侵犯他人权益、低俗色情、虚假信息等内容。禁止任何形式的人身攻击、骚扰、刷屏行为。违规者将被警告、禁言或封号处理。',
    },
    {
      heading: '四、知识产权',
      content: '您在社区发布的原创内容的知识产权归您所有，但您授予本社区免费的、非独占的、可转授权的许可，允许社区在平台内展示、传播您的内容。未经原作者同意，不得转载他人原创内容。',
    },
    {
      heading: '五、服务变更与终止',
      content: '本社区有权根据运营需要修改、中断或终止部分或全部服务，并会提前通知用户。您可以随时注销账号，注销后账号信息将不可恢复。',
    },
    {
      heading: '六、免责声明',
      content: '本社区为粉丝交流平台，不代表陈泽本人的官方立场。社区内用户发布的内容仅代表其个人观点，本社区不对其真实性、准确性承担责任。',
    },
  ],
};

const privacyContent = {
  title: '隐私政策',
  sections: [
    {
      heading: '一、信息收集',
      content: '我们收集的信息包括：注册时提供的邮箱地址和用户名；浏览、发帖、评论等社区行为数据；设备信息和日志数据（用于技术维护和安全保障）。我们不会收集您的身份证号、银行卡号等敏感信息。',
    },
    {
      heading: '二、信息用途',
      content: '我们使用收集的信息用于：提供和改善社区服务；个性化内容推荐；账号安全保护；发送重要通知（如社区规则变更、活动提醒）。我们不会将您的信息用于任何商业营销目的。',
    },
    {
      heading: '三、信息共享',
      content: '我们不会向任何第三方出售、出租您的个人信息。仅在以下情况下可能共享：经您明确同意；为履行法律义务（如司法要求）；保护社区和用户的合法权益。',
    },
    {
      heading: '四、信息安全',
      content: '我们采用行业标准的安全措施保护您的个人信息，包括数据加密传输、安全存储、访问控制等。但请理解，互联网环境下无法保证 100% 的信息安全。',
    },
    {
      heading: '五、Cookie 使用',
      content: '我们使用 Cookie 和类似技术来保持您的登录状态、记住您的偏好设置。您可以通过浏览器设置管理 Cookie，但禁用后可能影响部分功能的正常使用。',
    },
    {
      heading: '六、您的权利',
      content: '您有权查看、修改您的个人信息；您有权删除账号及关联数据；您有权拒绝接收非必要的通知。如需行使以上权利，请通过社区设置或联系我们。',
    },
    {
      heading: '七、政策更新',
      content: '我们可能会不时更新本隐私政策，更新后会在社区内发布通知。继续使用社区即表示您同意更新后的政策。本政策最后更新日期：2026年4月10日。',
    },
  ],
};

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.password) {
      setError('请填写邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.code !== 0) {
        setError(json.message || '登录失败');
        return;
      }
      localStorage.setItem('user', JSON.stringify(json.data.user));
      window.location.href = '/';
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex animate-fade-in-up">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative bg-gradient-to-br from-[#1890ff] to-[#096dd9] flex-col justify-between p-12 overflow-hidden">
        {/* 装饰圆圈 */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-12 w-40 h-40 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="relative z-10">
          <Link
            href="/"
            className="text-[36px] font-bold text-white tracking-tight"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            1103
          </Link>
        </div>

        {/* 中间标语 */}
        <div className="relative z-10 -mt-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
            <Gamepad2 className="w-4 h-4 text-white" />
            <span className="text-caption font-medium text-white/90">1103社区 · 老铁聚集地</span>
          </div>
          <h1 className="text-[28px] leading-[1.3] font-bold text-white">
            欢迎回来，
            <br />
            <span className="text-white/80">和老铁们一起整活儿</span>
          </h1>
          <p className="mt-4 text-[15px] leading-[1.8] text-white/60 max-w-sm">
            登录你的账号，查看最新动态、参与社区互动、和老铁们一起看直播聊游戏。
          </p>
        </div>

        {/* 底部信息 */}
        <div className="relative z-10">
          <p className="text-caption text-white/40">© 2026 ChenZe Community. All rights reserved.</p>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 py-12 bg-bg-page relative overflow-hidden">
        {/* 1103 背景水印 */}
        <div
          className="absolute -bottom-12 -right-6 text-[260px] leading-none font-bold text-primary/[0.06] select-none pointer-events-none"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </div>
        <div
          className="absolute -top-6 -right-4 text-[200px] leading-none font-bold text-primary/[0.05] select-none pointer-events-none -rotate-12"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </div>
        <div
          className="absolute top-1/3 -left-16 text-[140px] leading-none font-bold text-primary/[0.03] select-none pointer-events-none rotate-6"
          style={{ fontFamily: "'Blazed', sans-serif" }}
        >
          1103
        </div>
        <div className="w-full max-w-[400px] relative z-10">
          {/* 品牌标题 */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-[32px] font-bold text-primary tracking-tight inline-block mb-4"
              style={{ fontFamily: "'Blazed', sans-serif" }}
            >
              1103
            </Link>
            <h2 className="text-heading text-text-title">登录账号</h2>
            <p className="text-body text-text-muted mt-1">登录以访问1103社区的全部功能</p>
          </div>

          {/* 表单 */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-btn bg-red-50 text-danger text-body mb-4">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
                {/* 邮箱 */}
                <div>
                  <label className="text-body font-medium text-text-title mb-1.5 block">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="email"
                      placeholder="请输入邮箱地址"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-11 pl-10 pr-4 rounded-btn border border-border bg-white text-body text-text-title placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div>
                  <label className="text-body font-medium text-text-title mb-1.5 block">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full h-11 pl-10 pr-11 rounded-btn border border-border bg-white text-body text-text-title placeholder:text-text-disabled focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body transition-colors duration-150 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

            {/* 记住我 & 忘记密码 */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                />
                <span className="text-body text-text-body">记住我</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-body text-primary hover:underline cursor-pointer"
              >
                忘记密码？
              </Link>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 flex items-center justify-center gap-2 text-base mt-2 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            {/* 隐私协议 */}
            <p className="text-caption text-text-muted text-center mt-3 leading-relaxed">
              登录即表示你同意{' '}
              <button type="button" onClick={() => setModalType('terms')} className="text-primary hover:underline cursor-pointer">用户协议</button>
              {' '}和{' '}
              <button type="button" onClick={() => setModalType('privacy')} className="text-primary hover:underline cursor-pointer">隐私政策</button>
            </p>
          </form>

          {/* 注册入口 */}
          <p className="text-center text-body text-text-muted mt-6">
            还没有账号？{' '}
            <Link href="/join" className="text-primary font-medium hover:underline cursor-pointer">
              加入社区
            </Link>
          </p>

          {/* 返回首页 */}
          <div className="text-center mt-4">
            <Link href="/" className="text-caption text-text-muted hover:text-text-body transition-colors duration-150 cursor-pointer">
              ← 返回首页
            </Link>
          </div>
        </div>
      </div>
      {/* 弹窗 */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalType(null)} />
          <div className="relative bg-white rounded-card shadow-dropdown w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-divider flex-shrink-0">
              <h3 className="text-heading-sm text-text-title">
                {modalType === 'terms' ? termsContent.title : privacyContent.title}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="p-1.5 rounded-btn text-text-muted hover:text-text-body hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* 弹窗内容 */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {(modalType === 'terms' ? termsContent : privacyContent).sections.map((section) => (
                <div key={section.heading} className="mb-5 last:mb-0">
                  <h4 className="text-body font-semibold text-text-title mb-1.5">{section.heading}</h4>
                  <p className="text-body text-text-body leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
            {/* 弹窗底部 */}
            <div className="px-6 py-4 border-t border-divider flex-shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="btn-primary w-full h-10 flex items-center justify-center"
              >
                我已知晓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
