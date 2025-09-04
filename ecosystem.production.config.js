/*
 * 生产环境PM2配置文件
 * 支持微服务架构的Admin和H5服务
 */

module.exports = {
  apps: [
    {
      name: 'wx_ziyouyueke_admin',
      script: 'src/admin/admin-server.js',
      cwd: '/www/wwwroot/wx_ziyouyueke_service/',
      instances: 1,
      exec_mode: 'fork',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVICE: 'admin'
      },
      
      // 日志配置
      error_file: '/www/wwwroot/wx_ziyouyueke_service/logs/admin-err.log',
      out_file: '/www/wwwroot/wx_ziyouyueke_service/logs/admin-out.log',
      log_file: '/www/wwwroot/wx_ziyouyueke_service/logs/admin-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // 自动重启配置
      autorestart: true,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '60s',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log',
        '.git'
      ],
      
      // 环境变量文件
      env_file: '/www/wwwroot/wx_ziyouyueke_service/.env',
      
      // 进程间通信
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // 其他配置
      merge_logs: true,
      combine_logs: true
    },
    {
      name: 'wx_ziyouyueke_h5',
      script: 'src/h5/h5-server.js',
      cwd: '/www/wwwroot/wx_ziyouyueke_service/',
      instances: 'max',
      exec_mode: 'cluster',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SERVICE: 'h5'
      },
      
      // 日志配置
      error_file: '/www/wwwroot/wx_ziyouyueke_service/logs/h5-err.log',
      out_file: '/www/wwwroot/wx_ziyouyueke_service/logs/h5-out.log',
      log_file: '/www/wwwroot/wx_ziyouyueke_service/logs/h5-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // 自动重启配置
      autorestart: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '60s',
      
      // 监控配置
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log',
        '.git'
      ],
      
      // 环境变量文件
      env_file: '/www/wwwroot/wx_ziyouyueke_service/.env',
      
      // 进程间通信
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // 其他配置
      merge_logs: true,
      combine_logs: true
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'www',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:rueen/wx_ziyouyueke_service.git',
      path: '/www/wwwroot/wx_ziyouyueke_service',
      ssh_options: 'StrictHostKeyChecking=no',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.production.config.js --env production && pm2 save',
      'pre-setup': 'ls -la',
      'post-setup': 'ls -la && git --version'
    }
  }
};
