# 宝塔面板部署指南

## 一、环境准备

### 1. 安装 Node.js
宝塔面板 → 软件商店 → 搜索 "Node.js版本管理器" → 安装  
推荐版本：**Node.js 18.x LTS**

### 2. 安装 PM2
```bash
npm install -g pm2
```

## 二、项目部署

### 1. 克隆项目至服务器
```bash
cd /www/wwwroot
git clone git@gitee.com:lxxxx0211/1103-community.git chenze-community
# 或用 HTTPS：git clone https://gitee.com/lxxxx0211/1103-community.git chenze-community
```

### 2. 安装依赖 & 构建
```bash
cd /www/wwwroot/chenze-community
npm install --production=false
npx prisma generate
npm run build
```

### 3. 配置环境变量
复制 `.env.example` → `.env`，修改以下关键配置：

```env
# 必填 — JWT 密钥（务必用强随机值）
JWT_SECRET=<生成方式: openssl rand -hex 32>
ADMIN_JWT_SECRET=<生成方式: openssl rand -hex 32>

# 必填 — 数据库
DATABASE_URL="file:./prisma/data.db"

# 必填 — 腾讯云 COS
COS_SECRET_ID=your-secret-id
COS_SECRET_KEY=your-secret-key
COS_BUCKET=your-bucket-name
COS_REGION=ap-guangzhou
# 可选 — CDN 加速域名
# COS_CDN_DOMAIN=cdn.yourdomain.com

# 运行环境
NODE_ENV=production
PORT=3000
```

### 4. 用 PM2 启动
```bash
cd /www/wwwroot/chenze-community
pm2 start npm --name "chenze-community" -- start
pm2 save
pm2 startup   # 设置开机自启
```

### 5. 查看日志
```bash
pm2 logs chenze-community --lines 100
```

## 三、Nginx 反向代理配置

宝塔面板 → 网站 → 添加站点 → 域名填你的域名 → 创建后修改 Nginx 配置：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL 证书（宝塔自动管理）
    ssl_certificate    /www/server/panel/vhost/cert/yourdomain.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/yourdomain.com/privkey.pem;

    # 强制 HTTPS
    if ($server_port !~ 443) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }

    # Gzip 压缩
    gzip on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_vary on;

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /favicon.svg {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
    }

    # 健康检查（宝塔网站监控可配此路径）
    location = /api/health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }

    # Next.js 图片优化缓存
    location /_next/image {
        proxy_pass http://127.0.0.1:3000;
        expires 24h;
        add_header Cache-Control "public";
    }

    # 主代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 上传大小限制
        client_max_body_size 50m;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 四、PM2 ecosystem 配置（可选）

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'chenze-community',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/www/wwwroot/chenze-community',
    instances: 1,           // 单实例（SQLite 不支持多写）
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // 日志
    error_file: '/www/wwwlogs/chenze-community/error.log',
    out_file: '/www/wwwlogs/chenze-community/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
```

使用方式：
```bash
pm2 start ecosystem.config.js
pm2 save
```

## 五、常用运维命令

| 命令 | 说明 |
|------|------|
| `pm2 restart chenze-community` | 重启应用 |
| `pm2 stop chenze-community` | 停止应用 |
| `pm2 logs chenze-community` | 查看日志 |
| `pm2 monit` | 监控面板 |
| `curl http://127.0.0.1:3000/api/health` | 健康检查 |
| `npx prisma studio` | 数据库管理界面 |

## 六、更新部署

```bash
cd /www/wwwroot/chenze-community
git pull origin main         # 拉取最新代码
npm install                  # 安装新依赖
npx prisma generate          # 重新生成 Prisma Client
npx prisma db push           # 同步数据库 schema
npm run build                # 重新构建
pm2 restart chenze-community # 重启应用
```

## 七、注意事项

1. **JWT 密钥**：必须使用强随机密钥，切勿使用默认值
2. **SQLite**：单实例部署，PM2 `instances` 必须为 1
3. **备份**：定期备份 `prisma/data.db` 数据库文件
4. **SSL**：建议通过宝塔申请免费 Let's Encrypt 证书
5. **防火墙**：宝塔安全 → 放行 80/443 端口，3000 端口无需放行（Nginx 代理）
