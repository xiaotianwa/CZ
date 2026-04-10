'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Camera, ImageIcon } from 'lucide-react';

interface PhotoItem {
  id: string;
  url: string;
  thumbnail: string | null;
  description: string | null;
  sortOrder: number;
}

interface AlbumItem {
  id: string;
  title: string;
  category: string;
  cover: string;
  sortOrder: number;
  photos: PhotoItem[];
}

export default function GalleryPage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ albumId: string; photoIndex: number } | null>(null);

  useEffect(() => {
    fetch('/api/public/albums')
      .then((r) => r.json())
      .then((res) => { if (res.data) setAlbums(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categories = ['全部', ...Array.from(new Set(albums.map((a) => a.category)))];

  const filteredAlbums = activeCategory === '全部'
    ? albums
    : albums.filter((a) => a.category === activeCategory);

  const openAlbum = openAlbumId ? albums.find((a) => a.id === openAlbumId) : null;
  const currentAlbum = lightbox ? albums.find((a) => a.id === lightbox.albumId) : null;
  const currentPhoto = currentAlbum?.photos[lightbox?.photoIndex ?? 0];

  const navigate = (direction: 'prev' | 'next') => {
    if (!lightbox || !currentAlbum) return;
    const max = currentAlbum.photos.length - 1;
    const next = direction === 'prev' ? Math.max(0, lightbox.photoIndex - 1) : Math.min(max, lightbox.photoIndex + 1);
    setLightbox({ ...lightbox, photoIndex: next });
  };

  return (
    <>
      {/* 页头 */}
      <section className="bg-gray-900 pt-14 py-16 sm:py-20 relative overflow-hidden animate-fade-in-up">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] leading-none font-bold text-white select-none"
            style={{ fontFamily: "'Blazed', sans-serif" }}
          >
            1103
          </div>
        </div>
        <div className="container-main px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-caption font-medium text-primary">精选相册</span>
          </div>
          <h1 className="text-heading-lg text-white">记录每一个精彩瞬间</h1>
          <p className="text-body text-gray-400 mt-2 max-w-md mx-auto">
            直播高光、赛事现场、日常生活、粉丝投稿
          </p>
        </div>
      </section>

      {/* 分类筛选 */}
      <section className="section-block pb-0 animate-fade-in-up">
        <div className="container-main">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat as string}
                onClick={() => { setActiveCategory(cat as string); setOpenAlbumId(null); }}
                className={`h-8 px-4 rounded-full text-body font-medium transition-colors duration-150 cursor-pointer ${
                  activeCategory === cat ? 'bg-primary text-white' : 'bg-white border border-divider text-text-body hover:border-primary hover:text-primary'
                }`}
              >
                {cat as string}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 相册网格 / 照片视图 */}
      <section className="section-block animate-fade-in-up">
        <div className="container-main">
          {!openAlbum ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAlbums.map((album: any) => (
                <div
                  key={album.id}
                  className="group cursor-pointer"
                  onClick={() => setOpenAlbumId(album.id)}
                >
                  <div className="relative aspect-[4/3] rounded-card overflow-hidden bg-gray-100">
                    <Image src={album.cover} alt={album.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-body font-semibold text-white">{album.title}</h3>
                      <span className="text-caption text-white/70 inline-flex items-center gap-1 mt-0.5">
                        <ImageIcon className="w-3 h-3" />
                        {album.photos.length} 张
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setOpenAlbumId(null)}
                  className="text-body text-primary hover:underline cursor-pointer"
                >
                  ← 返回相册
                </button>
                <span className="text-text-muted">/</span>
                <h2 className="text-heading-sm text-text-title">{openAlbum.title}</h2>
                <span className="tag-muted">{openAlbum.photos.length} 张</span>
              </div>

              <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
                {openAlbum.photos.map((photo: any, idx: number) => (
                  <div
                    key={photo.id}
                    className="relative rounded-card overflow-hidden cursor-pointer group break-inside-avoid bg-gray-100"
                    onClick={() => setLightbox({ albumId: openAlbum.id, photoIndex: idx })}
                  >
                    <div className={`relative ${idx % 3 === 0 ? 'aspect-[3/4]' : idx % 3 === 1 ? 'aspect-square' : 'aspect-[4/3]'}`}>
                      <Image src={photo.url} alt={photo.description} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-caption text-white font-medium truncate">{photo.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && currentPhoto && currentAlbum && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors duration-150 cursor-pointer z-10" onClick={() => setLightbox(null)} aria-label="关闭">
            <X className="w-6 h-6" />
          </button>
          {lightbox.photoIndex > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer transition-colors duration-150" onClick={(e) => { e.stopPropagation(); navigate('prev'); }} aria-label="上一张">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {lightbox.photoIndex < currentAlbum.photos.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer transition-colors duration-150" onClick={(e) => { e.stopPropagation(); navigate('next'); }} aria-label="下一张">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          <div className="relative max-w-4xl max-h-[85vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-video rounded-card overflow-hidden bg-black">
              <Image src={currentPhoto.url} alt={currentPhoto.description || ''} fill className="object-contain" />
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-white/70 text-body">{currentPhoto.description}</p>
              <p className="text-white/40 text-caption flex-shrink-0 ml-4">{lightbox.photoIndex + 1} / {currentAlbum.photos.length}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
