/*
 * @Author: diaochan
 * @Date: 2025-09-03 19:49:18
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-03 21:21:47
 * @Description: 
 */
const { createApp, setupDatabase, startServer } = require('../shared/app-common');

// 引入H5端路由
const h5Routes = require('./routes/index');
const uploadRoutes = require('../shared/routes/upload');

// 引入课程超时管理器
const CourseTimeoutManager = require('../shared/utils/courseTimeout');

const PORT = process.env.H5_PORT || 3000;
const SERVICE_NAME = 'H5端';

/**
 * 启动H5端服务器
 */
const startH5Server = async () => {
  try {
    // 创建应用实例
    const app = createApp({
      serviceName: SERVICE_NAME,
      corsOrigins: [
        'http://localhost:3000', 
        'http://localhost:3001', 
        'https://your-domain.com'
      ]
    });

    // 设置数据库
    await setupDatabase();

    // 启动课程超时检查定时任务
    CourseTimeoutManager.startScheduledTask();

    // 配置路由
    app.use('/api/h5', h5Routes);
    app.use('/api/upload', uploadRoutes);

    // 更新根路径响应
    app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '自由约课H5端API服务',
        description: '提供用户认证、课程预约、师生关系等功能的RESTful API',
        version: require('../../package.json').version,
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          h5_api: '/api/h5',
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
    console.error('H5端服务器启动失败:', error);
    process.exit(1);
  }
};

// 启动应用
startH5Server();

module.exports = { startH5Server };