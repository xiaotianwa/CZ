# 🎴 卡牌对战模块 · TODO 清单

> 最后更新：2026-04-19（D2 全量拆分完成）
> 维护范围：`src/app/game/**` + `src/app/api/tcg/**` + `src/game/**`
>
> **本文档仅记录游戏板块**，社区 TODO 见 [`todo.md`](./todo.md)。

---

## 📊 总览

| 状态 | 数量 |
|------|:----:|
| ✅ 已完成 | 31 |
| 🔲 待完成（低优先级） | 8 |
| **合计** | **39** |

---

## ✅ 已完成（v1.3 / v1.4 / v1.5 部分）

### 基础建设
- [x] 卡组大小 25 → 35，终局回合 15 → 30（引擎实际数值）
- [x] 《对战规则.md》更新到 v1.3，数值与代码对齐
- [x] 移除本地热座 DEMO（`/game/play`）
- [x] 顶部导航与主大厅去除对战入口，保留：卡池 / 练习 / 好友房 / 排行
- [x] 运营后台 `/admin/game`（卡池 / 玩家 / 审计 / 赛季）

### 好友房对战（v1.3）
- [x] 6 位邀请码创建 / 加入
- [x] 确定性动作同步（seed + firstPlayer + action log）
- [x] 1s 轮询增量拉取对手动作
- [x] 登录保护：复用社区 User 表，未登录不能创建/加入（`/api/tcg/room/*` 中间件拦截）
- [x] 菜单页展示当前登录用户昵称

### 安全 & 数据一致性（v1.4）
- [x] **Phase A1** 服务端权威校验：action API 重建 state + `applyAction` 验证
- [x] **Phase A1** 禁止伪造对方动作（`action.player` 与 JWT 身份比对）
- [x] **Phase A1** 非房间成员拒绝写动作
- [x] **Phase A2** 对局结束落库 `TcgMatch` + 双方 `TcgPlayer` rating / tier / wins / losses 更新
- [x] **Phase A3** 房间 TTL 清理：waiting >30min / playing >2h / finished >24h，在 create 时按需清理

### 体验完善（v1.5 部分）
- [x] **Phase B1** 轮询指数退避（1s → 5s 封顶）+ 无新动作时逐步拉长
- [x] **Phase B1** 页面 `visibilitychange` 隐藏时暂停轮询
- [x] **Phase B4** 等待对手 10 分钟超时提示
- [x] **Phase B4** 在线模式隐藏"再来一局"按钮（防止本地 reset 与对手不同步）

### 技术债（v1.5 部分）
- [x] **Phase D1** 移除 13 处 `(prisma as any)` 类型断言
- [x] `types.ts:22` 过期注释修正（已删除的 `/game/play` → `Battle.tsx`）

### 中优先级已完成（v1.6）
- [x] **B2** 创建 / 加入房间时把 `roomCode + role` 写入 `sessionStorage`（`@/src/app/game/room/page.tsx`）
- [x] **B2** `/game/room` 挂载时检查 sessionStorage，请求 `/api/tcg/room/status` 重建引擎
- [x] **B2** 用 `seed + firstPlayer + decks + actions` 回放到最新 state（通过 `injectRef`）
- [x] **B2** 对局结束 / 主动退出 / 等待超时清空 sessionStorage
- [x] **B2** 边界处理：finished（提示并清）/ 404 过期（提示并清）/ 对手已退出（由现有 TTL 清理覆盖）
- [x] **B3** 创建 `GET /api/tcg/decks` 返回用户卡组列表
- [x] **B3** 创建 `POST /api/tcg/decks` 新建卡组（服务端允许草稿，仅限粗粒度上限）
- [x] **B3** 创建 `PUT /api/tcg/decks/:id` 更新（名称/卡牌/出战状态）
- [x] **B3** 创建 `DELETE /api/tcg/decks/:id` 删除
- [x] **B3** `/game/deck` 接入 `useCustomDecks` hook（登录走 API，未登录回退 localStorage，optimistic 更新）
- [x] **B3** `DeckPicker.useAllDeckOptions` 自动使用 hook，好友房 / 练习 「我的卡组」tab 自然生效
- [x] **B3** 顶部导航加入 `/game/deck` 入口
- [x] **C1** `src/game/ai.ts` 接受 `difficulty: 'easy' | 'normal' | 'hard'`
  - easy：贪心的随机版（出牌/攻击目标/换牌随机化）
  - normal：原贪心（保留）
  - hard：1 步前瞻 + 打分函数（枚举所有合法 action 选最高分）
- [x] **C1** `/game/practice` 文案刷新，反映各难度真实策略差异
- [x] **C1** AI 模式 GameOverOverlay 显示难度 / 耗时 / 回合
- [x] **D2** Battle.tsx 全量拆分至 `src/app/game/_components/battle/`
  - `shared.ts`（常量/工具：PRESET_MAP / RARITY_* / KW_ICON / KEYWORD_DICT / MECHANIC_DICT / extractMechanicTags / defNeedsTarget / rectCenter / Point / DictEntry）
  - `GameOverOverlay.tsx` · `LogPanel.tsx`
  - `HeroBar.tsx`（玩家栏 + EventBadge）
  - `BattleStage.tsx`（BoardRow + MinionCard）
  - `HandArea.tsx`（手牌区 + 结束回合按钮 + HandCard）
  - `BattleOverlay.tsx`（CardHoverPreview / AimArrow / MulliganOverlay / HelpModal / Speaker 图标）
  - `effects.tsx`（useDamageFloaters / DamageFloaters / useAttackFx / AttackFxLayer / useSfxFromState）
  - Battle.tsx 行数 **1787 → 575（-67.8%）**，`npx tsc --noEmit` 通过，游戏相关 85 个单元测试全部保持绿

---

## 🔲 待完成

###  低优先级（打磨 / v2.0）

#### C2. 战报回放页 `[~1.5 天]`
- [ ] `/game/replay/[matchId]` 新页
- [ ] 读取 `TcgMatch.replay` 反序列化 → 用 `initGame + applyAction` 依次重播
- [ ] UI：暂停 / 快进 / 步进 / 跳到关键帧（伤害 / 召唤 / 死亡）
- [ ] 复用 `Battle.tsx` 的只读模式（隐藏操作按钮）
- [ ] 个人中心 / 排行榜 → 点击对局跳转回放

#### C3. 观战 `[~2 天]`
- [ ] `/game/spectate/[code]` 新页
- [ ] `GET /api/tcg/room/status` 允许非成员只读访问（带 `spectator=true` 标记）
- [ ] 观战者看到双方手牌**反面**（与对手视角一致）
- [ ] 观战者无法提交动作
- [ ] （v2.0 建议改 WebSocket 推送减少轮询）

#### C4. 赛季系统激活 `[~2 天]`
- [ ] 运营后台启用 `TcgSeason`：创建赛季 / 设置时间
- [ ] `TcgMatch.seasonId` 按当前赛季写入
- [ ] 排行榜按赛季过滤
- [ ] 赛季结束脚本 `scripts/settle-season.ts`：rating → 1000、发放限定卡（`TcgCollection`）
- [ ] 赛季末奖励公告 / 邮件

#### D3. E2E 测试 `[~1.5 天]`
- [ ] Playwright 配置
- [ ] 测试场景：
  - 未登录进好友房 → 跳登录
  - 登录 A + 登录 B → 创建 → 加入 → 完整一局 → 验证 `TcgMatch` 落库
  - 非成员提交动作 → 403
  - 伪造对方动作 → 403
  - 房间过期清理
- [ ] 集成到 CI（`npm test:e2e`）

#### 其他小项
- [ ] **手牌动画优化**：出牌 / 抽牌 / 烧牌 用 Framer Motion 增强手感
- [ ] **音效扩充**：组合技触发 / SSR 登场 / 倒计时警告
- [ ] **卡牌详情 tooltip** 加入联动预览 GIF（需客户补素材）
- [ ] **「看陈泽动态得碎片」**：需要社区内容埋点 + `TcgCollection` 发放逻辑
- [ ] **能量经济**：每日 5 点对战能量 + 社区积分兑换（`TcgPlayer.energy` 已预留字段）
- [ ] **观战弹幕**：v2.0 目标
- [ ] **卡牌平衡性热更**：运营后台改数值后，进行中的对局需隔离旧版本

---

## 🔒 已明确不做（避免范围膨胀）

- ❌ **付费 / 抽卡 / 商店** — 项目定位完全免费
- ❌ **实时房间 WebSocket**（v1 阶段）— v2.0 再评估
- ❌ **NFC 实体卡**（v2 可选扩展）
- ❌ **公会系统** — 超出 MVP 范围
- ❌ **多语言 i18n** — 项目只面向中文用户
- ❌ **卡牌可视化编辑器前台入口** — `/game/preview` 保持为美术/管理员内部工具

---

## 🐛 已知 Bug / 风险点

- [ ] **action API 并发提交**：同时提交两个动作可能都 validate 通过但只记录后一个 → 改用事务 + 版本号乐观锁
- [ ] **Server-side CARD_DB 单例风险**：dev mode hot reload 会丢状态，建议用 `globalThis` 缓存注册
- [ ] **Guest 掉线后 host 无通知**：需心跳检测（15s 未轮询视为离线）
- [ ] **`TcgMatch.deckA/deckB`** 当前存原始 JSON 字符串（含 heroName 等），replay 时要保证卡池一致；卡池热更后旧战报可能无法重放

---

## 🗺️ 里程碑建议

| 版本 | 内容 | 预计工期 |
|------|------|:--------:|
| **v1.4** ✅ | Phase A（安全 + 数据一致性） | 已完成 |
| **v1.5** ✅ | Phase B1/B4 + D1 | 已完成 |
| **v1.6** ✅ | B2/B3 + C1 + D2 | 已完成（D2 容器 1787 → 575 行，-67.8%） |
| **v1.7** | C2 战报回放 | 1.5 天 |
| **v2.0** | WebSocket 实时 + 观战 + 赛季 + E2E | 2-3 周 |

---

## 📂 相关文档

- [`游戏方案.md`](./游戏方案.md) — 整体设计方案 v2
- [`对战规则.md`](./对战规则.md) — 规则书 v1.3
- [`游戏优化方案.md`](./游戏优化方案.md) — 自查与优化分析
- [`卡牌管理系统方案.md`](./卡牌管理系统方案.md) — 卡池管理后台方案
- [`卡池清单.md`](./卡池清单.md) — 首发卡池
- [`项目方案.md`](./项目方案.md) — 项目总方案

---

_（end of doc）_
