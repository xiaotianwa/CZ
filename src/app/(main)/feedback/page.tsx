import { HelpCircle, Lightbulb, MessagesSquare } from 'lucide-react';
import { prisma } from '@/lib/db';
import FeedbackActions from '@/components/FeedbackActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '反馈答疑', description: '查看社区反馈建议与答疑解惑回复' };

type FeedbackType = 'suggestion' | 'question' | 'bug' | 'other';

const typeConfig: Record<FeedbackType, { label: string; icon: typeof Lightbulb; className: string }> = {
  suggestion: { label: '建议', icon: Lightbulb, className: 'text-primary bg-primary-bg' },
  question: { label: '答疑', icon: HelpCircle, className: 'text-success bg-green-50' },
  bug: { label: 'Bug', icon: HelpCircle, className: 'text-danger bg-red-50' },
  other: { label: '其他', icon: MessagesSquare, className: 'text-text-muted bg-gray-100' },
};

function formatDateCN(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export default async function FeedbackPage() {
  const feedbackList = await prisma.feedback.findMany({
    where: {
      status: 'resolved',
      reply: { not: null },
      type: { in: ['suggestion', 'question'] },
    },
    select: {
      id: true,
      type: true,
      content: true,
      reply: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="container-main px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-primary-bg text-primary text-caption font-medium mb-4">
            <MessagesSquare className="w-4 h-4" />
            反馈建议 · 答疑解惑
          </div>
          <h1 className="text-heading-lg text-text-title">大家关心的问题与回复</h1>
          <p className="text-body text-text-muted mt-3 leading-relaxed">
            这里展示已回复的精选建议和答疑。有想法或疑问？直接点击下方按钮提交。
          </p>
          <FeedbackActions />
        </div>
      </section>

      <section className="container-main px-4 sm:px-6 lg:px-8 mt-10">
        {feedbackList.length === 0 ? (
          <div className="card max-w-2xl mx-auto py-14 text-center">
            <HelpCircle className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-body font-medium text-text-title">暂无已回复内容</p>
            <p className="text-caption text-text-muted mt-1">有新的精选回复后会展示在这里</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {feedbackList.map((item) => {
              const config = typeConfig[(item.type as FeedbackType) || 'other'] || typeConfig.other;
              const TypeIcon = config.icon;

              return (
                <article key={item.id} className="card p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.className}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`tag ${config.className}`}>{config.label}</span>
                        <span className="text-caption text-text-disabled">{formatDateCN(item.updatedAt)}</span>
                        <span className="text-caption text-text-muted">{item.user?.name || '匿名用户'}</span>
                      </div>
                      <div className="mt-3 rounded-btn bg-gray-50 border border-divider p-3">
                        <p className="text-caption font-medium text-text-muted mb-1">用户反馈</p>
                        <p className="text-body text-text-body whitespace-pre-wrap leading-relaxed">{item.content}</p>
                      </div>
                      <div className="mt-3 rounded-btn bg-primary-bg border border-primary/10 p-3">
                        <p className="text-caption font-medium text-primary mb-1">官方回复</p>
                        <p className="text-body text-text-body whitespace-pre-wrap leading-relaxed">{item.reply}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
