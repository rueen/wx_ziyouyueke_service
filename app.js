require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 引入数据库
const sequelize = require('./config/database');

// 引入路由
const h5Routes = require('./routes/h5');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

// 引入中间件
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// 引入课程超时管理器
const CourseTimeoutManager = require('./utils/courseTimeout');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 中间件配置
 */
// 安全相关
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 限制每个IP 15分钟内最多500个请求
  message: {
    success: false,
    code: 429,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use('/api', limiter);

// 基础中间件
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务已迁移到OSS，无需本地静态文件服务
// app.use('/uploads', express.static('uploads'));

/**
 * 路由配置
 */
app.use('/api/h5', h5Routes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 根路径响应（用于SSL证书验证和基本信息展示）
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '自由约课微信小程序API服务',
    description: '提供用户管理、课程预约、师生关系等功能的RESTful API',
    version: require('./package.json').version,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      h5_api: '/api/h5',
      admin_api: '/api/admin',
      upload_api: '/api/upload'
    }
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use(errorHandler);

/**
 * 启动服务器
 */
const startServer = async () => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步数据库模型（开发环境）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('数据库模型同步完成');
    }

    // 启动课程超时检查定时任务
    CourseTimeoutManager.startScheduledTask();

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
      logger.info(`健康检查: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  await sequelize.close();
  process.exit(0);
});

// 启动应用
startServer();

module.exports = app; 