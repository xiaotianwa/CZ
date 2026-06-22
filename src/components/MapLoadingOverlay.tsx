'use client';

export default function MapLoadingOverlay({ label = '正在加载地图' }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#020817]/88 text-white transition-opacity duration-500">
      <style>{`
        @keyframes mapLoaderOrbit {
          to { transform: rotate(360deg); }
        }
        @keyframes mapLoaderPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.45; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        @keyframes mapLoaderScan {
          0% { transform: translateX(-110%); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translateX(110%); opacity: 0; }
        }
      `}</style>
      <div className="relative flex flex-col items-center">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border border-sky-300/20" />
          <div className="absolute inset-2 rounded-full border border-amber-200/15" />
          <div className="absolute inset-0 rounded-full border-t-2 border-sky-300" style={{ animation: 'mapLoaderOrbit 1.35s linear infinite' }} />
          <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#7dd3fc,#0f4c81_48%,#031225_76%)] shadow-[0_0_36px_rgba(56,189,248,0.35)]" style={{ animation: 'mapLoaderPulse 2s ease-in-out infinite' }} />
          <div className="absolute left-7 right-7 top-1/2 h-px overflow-hidden bg-white/10">
            <span className="block h-full w-16 bg-gradient-to-r from-transparent via-white to-transparent" style={{ animation: 'mapLoaderScan 1.6s ease-in-out infinite' }} />
          </div>
          <div className="absolute -right-1 top-7 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.8)]" />
          <div className="absolute bottom-8 left-2 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.75)]" />
        </div>
        <p className="mt-5 text-caption font-semibold text-white">{label}</p>
        <p className="mt-2 text-[12px] text-white/45">正在同步城市点位与地图图层</p>
      </div>
    </div>
  );
}
