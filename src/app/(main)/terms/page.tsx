import { FileText, UserPlus, ShieldCheck, BookOpen, ServerCrash, AlertTriangle, Scale, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: '使用条款 - 1103社区',
  description: '1103社区使用条款，了解您在使用社区服务时的权利和义务。',
};

const sections = [
  {
    icon: FileText,
    heading: '一、协议范围',
    content: '本协议是您与1103社区（以下简称"本社区"）之间关于使用社区服务的法律协议。您注册成为本社区用户即表示接受本协议的全部条款。',
  },
  {
    icon: UserPlus,
    heading: '二、账号注册与安全',
    content: '您需提供有效的邮箱地址进行注册，并对账号下的所有活动负责。',
    items: [
      '请妥善保管您的密码，不得将账号转让、出借或出租给他人',
      '每个用户仅允许注册一个账号',
      '如发现账号被盗用，请立即联系我们',
      '使用虚假信息注册的账号可能被冻结或删除',
    ],
  },
  {
    icon: ShieldCheck,
    heading: '三、社区行为规范',
    content: '您在社区发布的内容应遵守中华人民共和国法律法规，并遵循以下规范：',
    items: [
      '不得发布违法违规、侵犯他人权益的内容',
      '不得发布低俗色情、暴力血腥、虚假谣言等有害内容',
      '禁止任何形式的人身攻击、骚扰、威胁行为',
      '禁止恶意刷屏、灌水、发布广告或垃圾信息',
      '不得冒充他人或误导其他用户',
      '尊重社区内每一位成员，维护友善的交流氛围',
    ],
    note: '违规者将根据情节严重程度给予警告、禁言或永久封号处理。',
  },
  {
    icon: BookOpen,
    heading: '四、知识产权',
    items: [
      '您在社区发布的原创内容的知识产权归您所有',
      '您授予本社区免费的、非独占的、可转授权的许可，允许社区在平台内展示、传播您的内容',
      '未经原作者同意，不得转载他人的原创内容',
      '如发现侵权内容，请及时举报，我们将在核实后处理',
    ],
  },
  {
    icon: ServerCrash,
    heading: '五、服务变更与终止',
    items: [
      '本社区有权根据运营需要修改、中断或终止部分或全部服务',
      '重大变更会提前在社区内发布公告通知用户',
      '您可以随时注销账号，注销后账号信息将不可恢复',
      '因不可抗力（如自然灾害、政策变化等）导致的服务中断，本社区不承担责任',
    ],
  },
  {
    icon: AlertTriangle,
    heading: '六、免责声明',
    items: [
      '本社区为粉丝交流平台，不代表陈泽本人的官方立场',
      '社区内用户发布的内容仅代表其个人观点',
      '本社区不对用户发布内容的真实性、准确性承担责任',
      '因用户违规操作导致的任何损失，由用户自行承担',
    ],
  },
  {
    icon: Scale,
    heading: '七、争议解决',
    content: '因本协议引起的或与本协议有关的争议，双方应友好协商解决。协商不成的，提交至本社区所在地有管辖权的人民法院。',
  },
];

export default function TermsPage() {
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
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-[28px] font-bold text-text-title">使用条款</h1>
          </div>
          <p className="text-body text-text-muted">
            最后更新：2026年4月14日 · 使用本社区服务前，请仔细阅读以下条款
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

        {/* Bottom note */}
        <div className="animate-fade-in-up mt-8 text-center text-caption text-text-muted" style={{ animationDelay: '0.6s' }}>
          <p>如对使用条款有任何疑问，请通过社区 <Link href="/" className="text-primary hover:underline">反馈与建议</Link> 功能联系我们</p>
          <p className="mt-2">同时请参阅我们的 <Link href="/privacy" className="text-primary hover:underline">隐私政策</Link></p>
        </div>
      </div>
    </div>
  );
}
