# 性能安全优化 TODO

> 最后更新：2026-04-20
> 当前范围：按 Phase 1-5 分阶段推进注册安全、上传链路、审核状态、异步任务与存储查询升级
> 执行原则：小步改动、保留逻辑开关、数据库结构尽量前兼容，便于问题出现时快速降级

---

## 一、Phase 1：注册防刷与服务端验证闭环（已完成）

### 1.1 目标
- [x] 把“前端答题 + 邮箱验证码”的弱防护，升级成服务端可验证、可限流、可一次性消费的注册闭环

### 1.2 当前痛点
- [x] [前端答题可绕过] `src/app/(main)/join/page.tsx` 有答题流程，但 `src/app/api/public/register/route.ts:16-74` 并未校验答题结果
- [x] [验证码缓存是内存] `src/lib/cache.ts:12`
- [x] [限流是单实例内存] `src/lib/rate-limit.ts:11`

### 1.3 本阶段改动范围

#### API
- [x] `POST /api/public/quiz/verify` 新增
- [x] `POST /api/public/send-code` 增强
- [x] `POST /api/public/register` 增强

#### 前端
- [x] `src/app/(main)/join/page.tsx`

#### 存储
- [x] 新增 `QuizPassToken`
- [x] 新增 `VerificationCode`
- [x] 可选新增 `SecurityEvent`

### 1.4 任务清单
- [x] [任务1] 新增服务端答题校验接口
  - [x] 接收题目 ID + 答案
  - [x] 服务端验证正确率/通过条件
  - [x] 通过后签发短期 `quiz_pass_token`
- [x] [任务2] 注册接口强制校验 `quiz_pass_token`
  - [x] token 绑定 `email` 或 `ip + ua_hash`
  - [x] 一次性消费
- [x] [任务3] 验证码从内存迁移到持久化/Redis
  - [x] 保留过期时间
  - [x] 保留发送状态
  - [x] 支持消费后失效
- [x] [任务4] 限流从进程内迁移到 Redis
  - [x] `send-code-ip`
  - [x] `send-code-email`
  - [x] `register`
  - [x] `login`
- [x] [任务5] 加风险记录
  - [x] 登录失败
  - [x] 注册失败
  - [x] 验证码错误
  - [x] 答题失败

### 1.5 验收标准
- [x] [绕过失败] 直接调 `register`，没有 `quiz_pass_token` 必须失败
- [x] [一次性] 同一个 `quiz_pass_token` 第二次使用失败
- [x] [多实例一致] 多实例下验证码和限流结果一致（Redis 优先 + 内存兜底）
- [x] [可追踪] 能查到某邮箱/IP 的发送和注册行为

### 1.6 回滚点
- [ ] [安全回滚] 先保留旧注册链路开关
- [ ] [回滚策略] 若新校验异常，可临时降级为“仅验证码注册”，但不回退数据库结构

---

## 二、Phase 2：上传链路重构，支持大文件与并发

### 2.1 目标
- [x] 把社区上传从“服务端吃整文件”改成“前端直传 COS + 服务端登记入库”

### 2.2 当前痛点
- [x] [服务端整文件入内存] `src/app/api/auth/upload-media/route.ts:52`（社区页/二创页已切直传）
- [ ] [服务端整文件入内存] `src/app/api/auth/upload-avatar/route.ts:34`（头像仍走旧接口，文件小可保留）
- [x] [社区页还在走旧上传接口] `src/app/(main)/community/page.tsx`（已改三段式直传）
- [x] [并发保护仅单进程] 社区/二创直传后不再经 Node 中转

### 2.3 本阶段改动范围

#### API
- [x] 强化 `POST /api/auth/presign-upload`（增加 category 白名单）
- [x] 强化 `POST /api/auth/media-record`（增加 ownerId/status/sha256/source）
- [x] 社区页停止使用 `/api/auth/upload-media`

#### 前端
- [x] `src/app/(main)/community/page.tsx`（三段式直传）
- [x] `src/app/(main)/fan-works/page.tsx`（图片+视频均已切直传）

#### 存储
- [x] 强化 `Media`（新增 ownerId/status/sha256/source/updatedAt 字段）
- [ ] 新增 `MediaUploadSession`（暂不需要，后续大文件分片时再加）
- [ ] 可选新增 `MediaChecksum`（sha256 已内嵌到 Media）

### 2.4 任务清单
- [x] [任务1] 给 `presign-upload` 增加上传约束
  - [x] 文件大小
  - [x] MIME 白名单
  - [x] `category` 白名单
  - [x] 用户身份校验
- [x] [任务2] 前端改成三段式上传
  - [x] 申请签名
  - [x] 浏览器直传 COS
  - [x] 调 `media-record` 入库
- [x] [任务3] `media-record` 增加归属和状态
  - [x] 记录 `ownerId`
  - [x] 记录 `status`
  - [x] 记录 `sha256`
  - [x] 记录 `source=direct_upload`
- [ ] [任务4] 大文件走分片上传设计（后续按需实施）
  - [ ] 第一阶段可先不做前端断点续传 UI
  - [ ] 但表结构先预留 `multipart` 字段
- [x] [任务5] 旧接口下线策略
  - [x] `upload-media` 保留过渡期（旧接口仍可用，已补 ownerId）
  - [x] 社区页/二创页已切完直传

### 2.5 验收标准
- [x] [内存改善] 社区上传不再经过 Node 中转
- [x] [稳定性] 50MB 视频上传不明显占用服务器内存（直传 COS）
- [x] [一致性] 每个已上传文件都能在 `Media` 中查到 ownerId/status
- [x] [安全性] media-record 校验 COS URL 合法性，不能伪造外部 URL

### 2.6 回滚点
- [ ] [安全回滚] 前端切换失败时，临时切回旧 `/api/auth/upload-media`
- [ ] [注意] 数据库新增字段/新表不用回滚，保持前兼容

---

## 三、Phase 3：内容审核状态化，禁止“异常放行”

### 3.1 目标
- [x] 把当前“审核失败默认放行”的策略，改成待审核/审核通过后可见

### 3.2 当前痛点
- [x] [图片审核异常放行] 已改为 needsReview
- [x] [文本审核异常放行] 已改为 needsReview
- [x] [视频默认先公开] 已改为 needsReview
- [x] [Media 无审核状态] 已加 status 字段
- [x] [Post 只有简单 status] 已扩展为 draft|pending_review|published|hidden|rejected

### 3.3 本阶段改动范围

#### API
- [x] `posts`（审核异常 -> pending_review）
- [x] `comments`（审核异常 -> pending_review）
- [ ] `upload-avatar`（头像小文件，暂保留原逻辑）
- [x] `upload-media`（Phase 2 已补 ownerId）
- [x] `media-record`（Phase 2 已补 ownerId/status）

#### 存储
- [x] 强化 `Post`（扩展 status 枚举）
- [x] 强化 `Comment`（新增 status 字段）
- [x] 强化 `Media`（Phase 2 已加 status）
- [x] 新增 `ModerationLog`（合并了 ModerationTask + ModerationResult）

#### 列表接口
- [x] 帖子列表已有 `status: 'published'` 过滤
- [x] 评论列表已加 `status: 'published'` 过滤

### 3.4 任务清单
- [x] [任务1] 增加状态机
  - [x] `Post.status: draft | pending_review | published | hidden | rejected`
  - [x] `Media.status: uploaded | scanning | approved | rejected | deleted`
  - [x] `Comment.status: pending_review | published | hidden | rejected`
- [x] [任务2] 发帖改成先入库再审核
  - [x] 文本不再“外部接口失败就直接发布”
- [x] [任务3] 审核结果落库 ModerationLog
  - [x] 保存供应商 (provider)
  - [x] 保存标签 (label)
  - [x] 保存 `score`
  - [x] 保存 `taskId`
- [x] [任务4] 公共列表只查 `published`
  - [x] 帖子列表已有 status 过滤
  - [x] 评论列表已加 status 过滤
- [ ] [任务5] 管理后台增加“审核队列”（后续实施）

### 3.5 验收标准
- [x] [异常安全] 外部审核失败时，内容进入 pending_review 不公开
- [x] [可复盘] ModerationLog 记录审核结果和失败原因
- [ ] [可运营] 管理后台审核队列（后续实施）

### 3.6 回滚点
- [ ] [回滚策略] 可临时把 `pending_review` 自动放行为 `published`
- [ ] [注意] 不建议删状态字段，只切逻辑开关

---

## 四、Phase 4：异步任务解耦

### 4.1 目标
- [x] 把积分、通知、热度刷新、视频审核提交等从接口主流程中拆出来

### 4.2 当前痛点
- [x] [裸 catch(() => {})] 发帖/评论已改为 enqueueJob
- [x] [裸 catch(() => {})] 通知/热度已改为 enqueueJob
- [ ] [推荐与热度现场算] `src/app/api/public/posts/route.ts`（后续可引入缓存层）

### 4.3 本阶段改动范围

#### 存储
- [x] 新增 `AsyncJob` 表

#### 运行时
- [x] 新增 `src/lib/async-job.ts`（入队 + worker）
- [x] 新增 `src/lib/job-handlers.ts`（处理器注册）
- [x] 新增 `src/app/api/internal/process-jobs/route.ts`（cron 触发端点）

#### 相关逻辑
- [x] `points`（已改为入队）
- [x] `notification`（已改为入队）
- [x] `hot-score`（已改为入队）
- [ ] `moderation`（视频审核回调待实现）

### 4.4 任务清单
- [x] [任务1] 建任务表 AsyncJob
- [x] [任务2] 发帖/评论后只入任务，不直接执行 side effect
- [x] [任务3] worker 轮询执行（processJobs + internal API）
- [x] [任务4] 失败重试 + 死信状态（maxAttempts=3，超过转 dead）
- [x] [任务5] 幂等键防重复发积分/重复通知（idempotencyKey unique）

### 4.5 验收标准
- [x] [主流程变快] 发帖/评论只做入队，不再同步执行积分/通知/热度
- [x] [失败可见] AsyncJob 记录 lastError、attempts、dead 状态
- [x] [幂等] idempotencyKey 唯一索引防重复

---

## 五、Phase 5：存储与查询升级

### 5.1 目标
- [x] 为数据量增长做准备，解决 JSON 字符串存储和 offset 分页问题

### 5.2 当前痛点
- [x] [Post.images 是 JSON 字符串] 已新增 PostMedia 关联表（旧 images 字段保留兼容）
- [ ] [SQLite 不适合中长期社区并发] 迁移 PostgreSQL 待后续规划
- [x] [offset 分页扩展性差] 已支持 cursor 分页

### 5.3 本阶段改动范围

#### 存储
- [x] `PostMedia` 关联表已创建
- [ ] PostgreSQL 迁移准备（后续规划）

#### 查询
- [x] `posts` 列表接口支持 cursor 分页
- [ ] 推荐接口预计算（后续规划）

### 5.4 任务清单
- [x] [任务1] 新增 `PostMedia`，逐步替代 `Post.images`（旧字段保留兼容）
- [x] [任务2] 列表改 cursor 分页（同时保持 offset 兼容）
- [ ] [任务3] 推荐结果预计算（后续规划）
- [ ] [任务4] 从 SQLite 迁移 PostgreSQL
