# 微博 Cookie 获取指南（解决 HTTP 432）

当抓取报 `HTTP 432` 时，意味着你的服务器 IP 被微博要求登录态访问。解决方法：**把浏览器登录态的 Cookie 配置到 `.env`**。

## ⚠️ 重要提示

- **用小号登录！** 不要用主号，防止账号被风控。注册一个备用微博账号专门用于抓取。
- Cookie 有效期通常 **30 ~ 90 天**，过期后重新获取即可。
- Cookie 属于敏感信息，**不要提交到 git**（`.env` 已在 `.gitignore` 中）。

## 📋 获取步骤（Chrome / Edge 通用）

### 1. 登录小号

用无痕窗口或另一个浏览器访问 👉 [https://m.weibo.cn](https://m.weibo.cn) 登录小号。

### 2. 打开开发者工具

登录完成后，**在同一个窗口**按 `F12` 打开开发者工具。

### 3. 切换到 Network 标签 → 刷新页面

- 顶部点「Network（网络）」标签
- 按 `F5` 刷新页面，让请求列表出现条目

### 4. 找到 `getIndex` 请求并复制 Cookie

1. 在请求列表筛选框输入 `getIndex` 或 `feed`
2. 点击任一返回 JSON 的请求
3. 右侧切到 「Headers」→ 滚动到 **Request Headers**（请求标头）
4. 找到 `Cookie:` 这一行，**右键 → 复制值** 或手动全选复制

Cookie 字符串类似：
```
SUB=_2A25LxxxxxxxxxxxxxxxxxxxxGHGA; SUBP=0033WrSXqPxxx...; _T_WM=abcdef1234; MLOGIN=1; WEIBOCN_FROM=1110006030; XSRF-TOKEN=xxxxx; ...
```

> 💡 **偷懒方法**：不用管具体字段，**整行 Cookie 一股脑粘贴过去即可**，代码会正确识别。

### 5. 粘贴到项目 `.env`

打开服务器上的 `.env`：

```env
WEIBO_COOKIE="SUB=_2A25LxxxxxxxxxxxxxxxxxxxxGHGA; SUBP=0033WrSXqPxxx...; _T_WM=abcdef1234; MLOGIN=1"
```

⚠️ **整行包在双引号内**，因为 cookie 里常带分号/等号。

### 6. 重启应用

```bash
pm2 reload ecosystem.config.js
pm2 save
```

### 7. 验证是否生效

**方法一：登录后台**

访问 `/admin/weibo` → 点「立即同步」→ 应提示"同步完成：新增 N 条..."

**方法二：命令行验证（推荐先跑）**

项目保留了一个一次性调试脚本，可以本地直接测试：

```bash
# Linux / macOS
WEIBO_COOKIE="整行cookie" npx tsx scripts/test-weibo-fetch.ts

# Windows PowerShell
$env:WEIBO_COOKIE="整行cookie"; npx tsx scripts/test-weibo-fetch.ts
```

预期输出：

```
[test] ✅ 抓取成功！耗时 XXXms
[test]   总条数：20
[test]   原创：15
[test]   被过滤：5
```

## 🔁 Cookie 过期了怎么办？

当日志再次出现 `HTTP 432` 或 `非 JSON 响应`，就是 cookie 过期了。**重复上面 1–6 步**重新获取粘贴即可，不需要改代码。

建议在日历上设一个 60 天提醒。

## 🚨 风险提示

- 微博可能对**抓取行为活跃的小号**做限制（如封禁、强制验证）。
- 抓取频率**不要低于 3 分钟**，否则触发账号风控概率上升。
- 只读取公开微博内容，不要滥用到发帖/评论等写操作。
- **绝对不要** 把真实主号的 cookie 放在服务器上。
