/*
 * @Author: diaochan
 * @Date: 2025-06-16 21:15:51
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-16 21:35:44
 * @Description: 
 */
// 宝塔面板专用PM2配置文件
// 适用于宝塔面板的标准目录结构

module.exports = {
  apps: [{
    name: 'yueke-api',
    script: 'app.js',
    cwd: '/www/wwwroot/yueke-api/',
    instances: 'max',
    exec_mode: 'cluster',
    
    // 环境配置
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    
    // 日志配置 (宝塔面板目录结构)
    error_file: '/www/wwwroot/yueke-api/logs/pm2-err.log',
    out_file: '/www/wwwroot/yueke-api/logs/pm2-out.log',
    log_file: '/www/wwwroot/yueke-api/logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 自动重启配置
    autorestart: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '60s',
    
    // Node.js 优化配置
    node_args: [
      '--max_old_space_size=1024',
      '--max_semi_space_size=64'
    ],
    
    // 监控配置
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log',
      '.git'
    ],
    
    // 宝塔面板环境变量文件
    env_file: '/www/wwwroot/yueke-api/.env',
    
    // 进程间通信
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
    
    // 集群配置
    instance_var: 'INSTANCE_ID',
    
    // 其他配置
    merge_logs: true,
    combine_logs: true
  }],

  // 宝塔面板部署配置
  deploy: {
    production: {
      user: 'www',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/rueen/wx_ziyouyueke_service.git',
      path: '/www/wwwroot/yueke-api',
      ssh_options: 'StrictHostKeyChecking=no',
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install --production && npm run migrate && pm2 reload ecosystem.bt.config.js --env production && pm2 save',
      'pre-setup': 'ls -la',
      'post-setup': 'ls -la && git --version'
    }
  }
}; 