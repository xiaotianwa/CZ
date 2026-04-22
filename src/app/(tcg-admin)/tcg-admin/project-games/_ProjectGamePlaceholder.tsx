import Link from 'next/link';
import { ArrowRight, Settings2 } from 'lucide-react';

interface ProjectGamePlaceholderProps {
  title: string;
  description: string;
}

export default function ProjectGamePlaceholder({ title, description }: ProjectGamePlaceholderProps) {
  return (
    <div className="card p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <Settings2 className="w-6 h-6 text-primary" />
      </div>
      <h3 className="mt-4 text-heading-sm text-text-title">{title}</h3>
      <p className="mt-2 max-w-2xl mx-auto text-body leading-7 text-text-muted">{description}</p>
      <div className="mt-5 flex items-center justify-center gap-3">
        <Link href="/tcg-admin/project-games" className="btn-outline h-9 px-4 text-caption">
          返回游戏总览
        </Link>
        <Link href="/tcg-admin/project-games" className="btn-primary h-9 px-4 text-caption inline-flex items-center gap-1.5">
          查看大厅与资料管理
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
