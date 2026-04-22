import ProjectGameModuleCards from './_ProjectGameModuleCards';
import GameCenterEntryManager from './_GameCenterEntryManager';

export default function TcgProjectGamesPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#141432]/60 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">当前项目游戏管理</h2>
            <p className="mt-1 text-sm text-white/50">这里是项目内游戏子模块总览页。各小游戏内容已拆成右侧导航中的独立子模块，本页只保留总览跳转与大厅入口管理。</p>
          </div>
          <span className="rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/15 px-3 py-1 text-xs text-[#C4B5FD]">项目子类</span>
        </div>
      </div>

      <ProjectGameModuleCards />

      <GameCenterEntryManager />
    </div>
  );
}
