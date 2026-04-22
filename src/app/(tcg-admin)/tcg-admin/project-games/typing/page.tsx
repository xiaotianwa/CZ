import { Keyboard } from 'lucide-react';
import TypingSentenceManager from '../_TypingSentenceManager';
import ProjectGameModuleShell from '../_ProjectGameModuleShell';

export default function ProjectGamesTypingPage() {
  return (
    <ProjectGameModuleShell
      title="弹幕打字赛"
      description="这里单独维护打字赛词库与文案素材，用于驱动 /play/typing。"
      icon={Keyboard}
      badge="词库管理"
      meta={['独立词库', '支持启停与排序', '前台已切换独立数据源']}
    >
      <TypingSentenceManager />
    </ProjectGameModuleShell>
  );
}
