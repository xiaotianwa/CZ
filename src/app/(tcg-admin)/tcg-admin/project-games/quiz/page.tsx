import { HelpCircle } from 'lucide-react';
import GameQuizManager from '../_GameQuizManager';
import ProjectGameModuleShell from '../_ProjectGameModuleShell';

export default function ProjectGamesQuizPage() {
  return (
    <ProjectGameModuleShell
      title="1103 知识问答"
      description="这里单独维护游戏端问答题库，和社区后台注册问答内容完全隔离。"
      icon={HelpCircle}
      badge="独立题库"
      meta={['游戏端独立管理', '不复用社区问答', '已切换独立数据源']}
    >
      <GameQuizManager />
    </ProjectGameModuleShell>
  );
}
