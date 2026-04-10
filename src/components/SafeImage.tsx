'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function SafeImage({ src, alt, fill, className, fallbackText }: { src: string; alt: string; fill?: boolean; className?: string; fallbackText?: string }) {
  const [error, setError] = useState(false);

  if (error) {
    if (fallbackText) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xs font-bold text-primary">
          {fallbackText}
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return <Image src={src} alt={alt} fill={fill} className={className} onError={() => setError(true)} />;
}
