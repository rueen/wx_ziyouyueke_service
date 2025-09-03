/*
 * @Author: diaochan
 * @Date: 2025-09-03 19:49:07
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-03 21:21:39
 * @Description: 
 */
const { createApp, setupDatabase, startServer } = require('../shared/app-common');

// 引入管理端路由
const adminRoutes = require('./routes/index');
const uploadRoutes = require('../shared/routes/upload');

const PORT = process.env.ADMIN_PORT || 3001;
const SERVICE_NAME = '管理端';

/**
 * 启动管理端服务器
 */
const startAdminServer = async () => {
  try {
    // 创建应用实例
    const app = createApp({
      serviceName: SERVICE_NAME,
      corsOrigins: [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'https://your-admin-domain.com'
      ]
    });

    // 设置数据库（管理端需要创建默认管理员）
    await setupDatabase();

    // 配置路由
    app.use('/api/admin', adminRoutes);
    app.use('/api/upload', uploadRoutes);

    // 更新根路径响应
    app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '自由约课管理端API服务',
        description: '提供用户管理、课程管理等功能的RESTful API',
        version: require('../../package.json').version,
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          admin_api: '/api/admin',
          upload_api: '/api/upload'
        }
      });
    });

    // 404处理（必须在所有路由配置之后）
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        code: 404,
        message: '接口不存在'
      });
    });

    // 启动服务器
    await startServer(app, PORT, SERVICE_NAME);
    
  } catch (error) {
    console.error('管理端服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startAdminServer();

module.exports = { startAdminServer };