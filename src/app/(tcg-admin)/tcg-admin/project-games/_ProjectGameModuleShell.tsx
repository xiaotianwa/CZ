import Link from 'next/link';
import { ChevronLeft, type LucideIcon } from 'lucide-react';

interface ProjectGameModuleShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  meta?: string[];
  children: React.ReactNode;
}

export default function ProjectGameModuleShell({
  title,
  description,
  icon: Icon,
  badge,
  meta = [],
  children,
}: ProjectGameModuleShellProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#141432]/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  {badge ? (
                    <span className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/15 px-3 py-1 text-xs text-[#C4B5FD]">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-white/50 max-w-3xl">{description}</p>
              </div>
            </div>
            {meta.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {meta.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <Link href="/tcg-admin/project-games" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <ChevronLeft className="w-3.5 h-3.5" /> 返回总览
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
