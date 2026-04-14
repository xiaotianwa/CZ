import { Shield, Mail, Lock, Cookie, UserCheck, RefreshCw, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: '隐私政策 - 1103社区',
  description: '1103社区隐私政策，了解我们如何收集、使用和保护您的个人信息。',
};

const sections = [
  {
    icon: Database,
    heading: '一、信息收集',
    items: [
      '注册时提供的邮箱地址和用户名',
      '浏览、发帖、评论等社区行为数据',
      '设备信息和日志数据（用于技术维护和安全保障）',
    ],
    note: '我们不会收集您的身份证号、银行卡号等敏感信息。',
  },
  {
    icon: Shield,
    heading: '二、信息用途',
    items: [
      '提供和改善社区服务',
      '个性化内容推荐',
      '账号安全保护',
      '发送重要通知（如社区规则变更、活动提醒）',
    ],
    note: '我们不会将您的信息用于任何商业营销目的。',
  },
  {
    icon: Lock,
    heading: '三、信息共享',
    content: '我们不会向任何第三方出售、出租您的个人信息。仅在以下情况下可能共享：',
    items: [
      '经您明确同意',
      '为履行法律义务（如司法要求）',
      '保护社区和用户的合法权益',
    ],
  },
  {
    icon: Shield,
    heading: '四、信息安全',
    content: '我们采用行业标准的安全措施保护您的个人信息，包括：',
    items: [
      '数据加密传输（HTTPS / TLS）',
      '安全存储与访问控制',
      '密码使用 bcrypt 加密存储，任何人（包括管理员）均无法查看',
      '敏感操作需验证码二次确认',
    ],
    note: '但请理解，互联网环境下无法保证 100% 的信息安全。',
  },
  {
    icon: Cookie,
    heading: '五、Cookie 使用',
    content: '我们使用 Cookie 和类似技术来：',
    items: [
      '保持您的登录状态',
      '记住您的偏好设置',
      '分析社区使用情况以改善服务',
    ],
    note: '您可以通过浏览器设置管理 Cookie，但禁用后可能影响部分功能的正常使用。',
  },
  {
    icon: UserCheck,
    heading: '六、您的权利',
    items: [
      '查看和修改您的个人信息',
      '删除账号及关联数据',
      '拒绝接收非必要的通知',
      '导出您的个人数据',
    ],
    note: '如需行使以上权利，请通过社区设置或联系我们。',
  },
  {
    icon: RefreshCw,
    heading: '七、政策更新',
    content: '我们可能会不时更新本隐私政策，更新后会在社区内发布通知。继续使用社区即表示您同意更新后的政策。',
  },
];

export default function PrivacyPage() {
  return (
    <div className="pt-14 min-h-screen bg-gray-50/50">
      {/* Header */}
      <section className="bg-white border-b border-divider">
        <div className="container-main px-4 sm:px-6 lg:px-8 py-10 max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-caption text-text-muted hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            返回首页
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-[28px] font-bold text-text-title">隐私政策</h1>
          </div>
          <p className="text-body text-text-muted">
            最后更新：2026年4月14日 · 1103社区承诺保护您的隐私
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="container-main px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div
              key={section.heading}
              className="animate-fade-in-up bg-white rounded-card border border-divider p-6"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <section.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="text-body font-semibold text-text-title">{section.heading}</h2>
              </div>
              {section.content && (
                <p className="text-body text-text-body leading-relaxed mb-2">{section.content}</p>
              )}
              {section.items && (
                <ul className="space-y-1.5 mb-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-body text-text-body leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <p className="text-caption text-text-muted mt-2 pl-3.5 border-l-2 border-primary/20">{section.note}</p>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="animate-fade-in-up mt-8 bg-primary/5 border border-primary/15 rounded-card p-6 text-center" style={{ animationDelay: '0.6s' }}>
          <Mail className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-body font-medium text-text-title">有疑问？</p>
          <p className="text-caption text-text-muted mt-1">
            如对隐私政策有任何问题，请通过社区
            <Link href="/" className="text-primary hover:underline mx-1">反馈与建议</Link>
            功能联系我们
          </p>
        </div>
      </div>
    </div>
  );
}
