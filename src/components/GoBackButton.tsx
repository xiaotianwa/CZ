'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function GoBackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-text-body text-sm font-medium hover:bg-white dark:hover:bg-white/10 transition-colors duration-150 active:scale-[0.98] cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" />
      返回上一页
    </button>
  );
}
