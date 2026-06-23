'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageIcon, X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: string;
  createdAt: string;
}

export function UserMediaGallery() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetch('/api/auth/media-record', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && Array.isArray(json.data)) {
          setItems(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>暂无媒体</p>
        <p className="text-sm mt-1">去首页或反馈页面上传图片吧</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setSelectedItem(item)}
          >
            {item.type.startsWith('image/') ? (
              <Image
                src={item.url}
                alt="用户媒体"
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 图片预览弹窗 */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full">
            <button
              type="button"
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
              onClick={() => setSelectedItem(null)}
            >
              <X className="w-6 h-6" />
            </button>
            {selectedItem.type.startsWith('image/') ? (
              <Image
                src={selectedItem.url}
                alt="预览"
                width={800}
                height={800}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-white/50">
                不支持预览此类型
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
