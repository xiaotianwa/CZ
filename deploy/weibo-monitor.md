# 微博动态监控 - 部署说明

## 功能概览

- 每 3 分钟自动抓取博主（UID=7795649284 "陈泽"）微博主页最新动态
- 自动过滤非原创（转发 / 含 `//@` / 以"转发"开头）
- 按 `mid` 去重入库
- 后台管理页：`/admin/weibo`（可手动触发、隐藏、删除）
- 前台展示页：`/weibo`（按发布时间倒序、支持加载更多）

## 架构

```
┌────────────────────────┐      每 3 分钟     ┌─────────────────────────┐
│ PM2: chenze-weibo-cron │ ─────HTTP ──────▶ │ /api/cron/weibo-sync    │
│ (scripts/weibo-cron.js)│  Bearer Token     │ (Next.js route handler) │
└────────────────────────┘                   └────────────┬────────────┘
                                                          │
                                    ┌─────────────────────▼─────────────────┐
                                    │  src/lib/weibo/sync.ts                │
                                    │   └─ fetcher: m.weibo.cn/api/getIndex │
                                    │   └─ 原创过滤                          │
                                    │   └─ 按 mid 去重写入 WeiboPost         │
                                    └───────────────────────────────────────┘
```

## 首次部署

### 1. 执行 Prisma 迁移

```bash
npx prisma migrate deploy
npx prisma generate
```

### 2. 配置环境变量

在 `.env` 中新增：

```env
# 定时任务密钥（强烈建议设置）
CRON_SECRET="用 openssl rand -hex 32 生成的强随机值"
```

### 3. 重启 PM2

```bash
pm2 reload ecosystem.config.js
pm2 save
```

此时 PM2 会启动两个进程：

- `chenze-community` - Next.js 主应用
- `chenze-weibo-cron` - 微博定时同步 worker

### 4. 验证

```bash
# 查看 worker 日志
pm2 logs chenze-weibo-cron --lines 50

# 手动触发一次（需带 token）
curl -H "Authorization: Bearer $CRON_SECRET" \
     http://127.0.0.1:3000/api/cron/weibo-sync

# 或登录后台管理页点"立即同步"
# http://your-domain/admin/weibo
```

## 可调参数

在 `ecosystem.config.js` 的 `chenze-weibo-cron.env` 中：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `WEIBO_CRON_URL` | `http://127.0.0.1:3000/api/cron/weibo-sync` | 触发端点 URL |
| `WEIBO_CRON_INTERVAL` | `180000`（3 分钟） | 轮询间隔（毫秒），建议不低于 2 分钟避免风控 |
| `WEIBO_CRON_INITIAL_DELAY` | `30000`（30 秒） | 首次启动延迟，避免应用未就绪 |
| `CRON_SECRET` | 无 | 与 Next.js 侧一致；未设置时接口无鉴权 |

## 常见问题

### Q1：日志显示 "HTTP 432 / 418 / 403 / 非 JSON 响应"？

微博风控。按优先级尝试：

**方法 1：配置真实 cookie（最稳，强烈推荐）**

1. 浏览器访问 [https://m.weibo.cn](https://m.weibo.cn) 登录任意微博账号（小号即可）
2. F12 打开开发者工具 → Network 标签 → 刷新页面 → 点击任一请求 → 找到 Request Headers 的 `Cookie:` 整行
3. 复制后粘贴到 `.env`：
   ```env
   WEIBO_COOKIE="SUB=_2A25xxx; SUBP=xxx; _T_WM=xxx; ..."
   ```
4. `pm2 reload ecosystem.config.js` 重启

**方法 2：降低频率**

将 `WEIBO_CRON_INTERVAL` 从 3 分钟改为 5–10 分钟：
```js
// ecosystem.config.js
WEIBO_CRON_INTERVAL: 5 * 60 * 1000,  // 5 分钟
```

**方法 3：更换出口 IP**

若服务器 IP 已进黑名单，考虑：
- 换台服务器或切换云厂商
- 使用代理池（需代码改造，当前未支持）

### Q2：如何关闭微博同步 worker？

```bash
pm2 stop chenze-weibo-cron       # 停止
pm2 delete chenze-weibo-cron     # 删除
```

不影响主站运行。

### Q3：如何更换监控博主？

修改 `src/lib/weibo/config.ts` 的 `UID` 常量，重启应用即可。

### Q4：已删除的微博会被重新抓取吗？

不会。基于 `mid` 唯一索引去重，后台删除后该 mid 永久不会再入库。如需恢复，需手动触发全量抓取或在数据库中还原。

## 回滚

如需完全回滚本次功能，执行：

```bash
# 1. 停止 worker
pm2 stop chenze-weibo-cron && pm2 delete chenze-weibo-cron

# 2. 回退代码到本次功能之前的 commit
git revert <commit-hash>

# 3. 回滚数据库迁移
npx prisma migrate resolve --rolled-back 20260416180055_add_weibo_post_table
# 手动在 SQLite 中执行：DROP TABLE IF EXISTS WeiboPost;

# 4. 重启
pm2 reload ecosystem.config.js
```
