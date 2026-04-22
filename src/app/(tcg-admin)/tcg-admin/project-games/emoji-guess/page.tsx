import { Smile } from 'lucide-react';
import EmojiPuzzleManager from '../_EmojiPuzzleManager';
import ProjectGameModuleShell from '../_ProjectGameModuleShell';

export default function ProjectGamesEmojiGuessPage() {
  return (
    <ProjectGameModuleShell
      title="表情猜猜猜"
      description="这里单独维护表情题库、提示词和答案，用于驱动 /play/emoji-guess。"
      icon={Smile}
      badge="题库管理"
      meta={['独立 emoji 题库', '支持启停与排序', '前台已切换独立数据源']}
    >
      <EmojiPuzzleManager />
    </ProjectGameModuleShell>
  );
}
