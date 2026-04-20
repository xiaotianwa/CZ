'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ChevronDown, Music } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
  cover?: string | null;
  duration?: number | null;
}

/** 将 COS 直链转为服务端代理 URL，绕过浏览器 CORS/PNA 限制 */
function proxyUrl(src: string): string {
  try {
    const u = new URL(src);
    if (u.hostname.endsWith('.myqcloud.com')) {
      return `/api/media-proxy?url=${encodeURIComponent(src)}`;
    }
  } catch {}
  return src;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fetched, setFetched] = useState(false);

  const [autoPlayPending, setAutoPlayPending] = useState(false);

  useEffect(() => {
    console.log('[MusicPlayer] 开始请求 /api/music');
    fetch('/api/music')
      .then((res) => res.json())
      .then((json) => {
        console.log('[MusicPlayer] API 返回:', JSON.stringify(json).slice(0, 300));
        if (json.code === 0 && json.data?.length > 0) {
          setPlaylist(json.data);
          console.log('[MusicPlayer] 播放列表已设置, 条数:', json.data.length);
        } else {
          console.warn('[MusicPlayer] 无可用音乐, code:', json.code, 'data长度:', json.data?.length ?? 0);
        }
      })
      .catch((err) => {
        console.error('[MusicPlayer] 请求失败:', err);
      })
      .finally(() => setFetched(true));
  }, []);

  // Listen for splash screen "enter" event to auto-play
  useEffect(() => {
    const onSplashEnter = () => setAutoPlayPending(true);
    window.addEventListener('splash-enter', onSplashEnter);
    return () => window.removeEventListener('splash-enter', onSplashEnter);
  }, []);

  // Auto-play when playlist is loaded and splash enter was triggered
  useEffect(() => {
    if (autoPlayPending && playlist.length > 0 && audioRef.current) {
      setAutoPlayPending(false);
      setCurrentIndex(0);
      setIsPlaying(true);
      audioRef.current.src = proxyUrl(playlist[0].src);
      audioRef.current.play()
        .then(() => {
          // Notify SplashScreen that music is now playing
          window.dispatchEvent(new CustomEvent('music-playing'));
        })
        .catch(() => {});
    }
  }, [autoPlayPending, playlist]);

  const track = playlist[currentIndex];

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const nextTrack = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % playlist.length);
  }, [playlist.length]);

  const prevTrack = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onMeta = () => {
      setDuration(audio.duration);
    };
    const onEnded = () => {
      nextTrack();
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, [nextTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentIndex, isPlaying]);

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!fetched || playlist.length === 0) return null;

  return (
    <>
      <audio ref={audioRef} src={track ? proxyUrl(track.src) : undefined} muted={muted} preload="metadata" />

      <div className="fixed left-3 sm:left-4 md:left-6 bottom-[calc(68px+env(safe-area-inset-bottom))] md:bottom-6 z-50 select-none">
        {/* Expanded Panel */}
        <div
          className={`absolute bottom-full left-0 mb-3 w-72 transition-all duration-300 ease-out ${
            expanded
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/80 overflow-hidden">
            {/* Track Info Header */}
            <div className="bg-gray-900 px-4 py-3 flex items-center gap-3">
              {/* Mini spinning disc */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center ${
                    isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''
                  }`}
                >
                  <div className="w-3 h-3 rounded-full bg-gray-600 border border-gray-500" />
                  {track.cover ? (
                    <img src={track.cover} alt="" className="absolute inset-0 w-full h-full rounded-full object-cover opacity-60" />
                  ) : null}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-400 truncate">{track.artist}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pt-3">
              <div className="h-1 bg-gray-100 rounded-full cursor-pointer group" onClick={seekTo}>
                <div
                  className="h-full bg-gray-900 rounded-full relative transition-all duration-100"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{formatTime(currentTime)}</span>
                <span className="text-[10px] text-gray-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 px-4 pb-3 pt-1">
              <button
                onClick={() => setMuted(!muted)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={prevTrack}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={nextTrack}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Playlist */}
            <div className="border-t border-gray-100 max-h-36 overflow-y-auto">
              {playlist.map((t: Track, i: number) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); setIsPlaying(true); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                    i === currentIndex ? 'bg-gray-50' : ''
                  }`}
                >
                  <Music className={`w-3.5 h-3.5 flex-shrink-0 ${i === currentIndex ? 'text-gray-900' : 'text-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs truncate block ${i === currentIndex ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {t.title}
                    </span>
                  </div>
                  {i === currentIndex && isPlaying && (
                    <div className="flex items-end gap-[2px] h-3">
                      <span className="w-[2px] bg-gray-900 rounded-full animate-[musicBar1_0.8s_ease-in-out_infinite]" />
                      <span className="w-[2px] bg-gray-900 rounded-full animate-[musicBar2_0.6s_ease-in-out_infinite_0.2s]" />
                      <span className="w-[2px] bg-gray-900 rounded-full animate-[musicBar3_0.7s_ease-in-out_infinite_0.1s]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Vinyl Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="group relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          title="音乐播放器"
        >
          {/* Vinyl Record */}
          <div
            className={`absolute inset-0 rounded-full bg-gray-900 ${
              isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''
            }`}
          >
            {/* Grooves */}
            <div className="absolute inset-[6px] rounded-full border border-gray-700/40" />
            <div className="absolute inset-[10px] rounded-full border border-gray-700/30" />
            <div className="absolute inset-[14px] rounded-full border border-gray-700/20" />
            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              </div>
            </div>
            {/* Highlight arc */}
            <div className="absolute top-[3px] left-[8px] w-3 h-6 rounded-full bg-white/5 rotate-[-30deg]" />
          </div>
          {/* Play state indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
              <Play className="w-5 h-5 text-white ml-0.5 drop-shadow" />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
