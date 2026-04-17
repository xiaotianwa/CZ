module.exports = {
  apps: [
    {
      name: 'chenze-community',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    {
      name: 'chenze-weibo-cron',
      script: './scripts/weibo-cron.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '128M',
      autorestart: true,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        WEIBO_CRON_URL: 'http://127.0.0.1:3000/api/cron/weibo-sync',
        WEIBO_CRON_INTERVAL: 3 * 60 * 1000,
        WEIBO_CRON_INITIAL_DELAY: 30 * 1000,
        // CRON_SECRET 由系统环境变量或 .env 注入
      },
      error_file: './logs/weibo-cron-error.log',
      out_file: './logs/weibo-cron-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
