/*
 * @Author: diaochan
 * @Date: 2025-09-03 19:58:48
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-03 21:34:19
 * @Description: 
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 引入共享中间件
const { errorHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

/**
 * 创建通用的 Express 应用配置
 * @param {Object} options - 配置选项
 * @param {string} options.serviceName - 服务名称
 * @param {Array} options.corsOrigins - CORS 允许的源
 * @returns {Object} Express 应用实例
 */
const createApp = (options = {}) => {
  const {
    serviceName = 'API服务',
    corsOrigins = ['http://localhost:3000', 'http://localhost:3001']
  } = options;

  const app = express();

  /**
   * 信任代理设置（用于宝塔面板等反向代理环境）
   */
  app.set('trust proxy', 1);

  /**
   * 安全中间件
   */
  app.use(helmet());
  app.use(cors({
    origin: corsOrigins,
    credentials: true
  }));

  /**
   * 请求限制中间件
   */
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 500, // 限制每个IP 15分钟内最多500个请求
    message: {
      success: false,
      code: 429,
      message: '请求过于频繁，请稍后再试'
    },
    // 信任代理，正确处理X-Forwarded-For头
    trustProxy: true,
    // 跳过成功请求的计数（可选）
    skipSuccessfulRequests: false,
    // 跳过失败请求的计数（可选）
    skipFailedRequests: false
  });
  app.use('/api', limiter);

  /**
   * 基础中间件
   */
  app.use(compression());
  app.use(morgan('combined', { 
    stream: { write: (message) => logger.info(message.trim()) } 
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  /**
   * 健康检查接口
   */
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: `${serviceName}运行正常`,
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version
    });
  });

  /**
   * 根路径响应
   */
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: `自由约课${serviceName}`,
      description: `提供${serviceName}相关功能的RESTful API`,
      version: require('../../package.json').version,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * 错误处理中间件（404处理将在路由配置后添加）
   */
  app.use(errorHandler);

  return app;
};

/**
 * 智能数据库初始化（使用外部初始化器）
 * 返回值：{ isFirstDeploy: boolean, newTables: string[] }
 */
const smartDatabaseInit = async () => {
  const DatabaseInitializer = require('./database/database-initializer');
  const initializer = new DatabaseInitializer();
  return await initializer.initialize();
};

/**
 * 数据库连接和同步
 * @param {Object} options - 配置选项
 * @param {boolean} options.enableSync - 是否启用数据库同步
 */
const setupDatabase = async (options = {}) => {
  const sequelize = require('./config/database');
  const { enableSync = true } = options;

  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    if (enableSync) {
      // 执行数据库初始化
      try {
        const { isFirstDeploy, newTables } = await smartDatabaseInit();
        
        if (isFirstDeploy) {
          logger.info('首次部署完成，所有表和默认数据已创建');
        } else if (newTables.length > 0) {
          logger.info(`新表创建完成: ${newTables.join(', ')}`);
        } else {
          logger.info('所有表已存在，无需创建新表');
        }
      } catch (syncError) {
        // 如果同步失败，记录警告但不中断启动
        logger.warn('数据库初始化遇到问题:', syncError.message);
        logger.info('尝试继续启动服务...');
      }
    } else {
      logger.info('跳过数据库同步，仅验证连接');
    }
  } catch (error) {
    logger.error('数据库设置失败:', error);
    throw error;
  }
};

/**
 * 启动服务器
 */
const startServer = (app, port, serviceName) => {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        logger.info(`${serviceName}服务器运行在端口 ${port}`);
        logger.info(`环境: ${process.env.NODE_ENV}`);
        logger.info(`健康检查: http://localhost:${port}/health`);
        resolve(server);
      });

      // 优雅关闭处理
      const gracefulShutdown = async (signal) => {
        logger.info(`${serviceName}收到${signal}信号，正在关闭服务器...`);
        const sequelize = require('./config/database');
        await sequelize.close();
        process.exit(0);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
      logger.error(`${serviceName}服务器启动失败:`, error);
      reject(error);
    }
  });
};

/**
 * 设置定时任务
 */
const setupCronJobs = () => {
  const cron = require('node-cron');
  const lessonExpireService = require('./services/lessonExpireService');
  
  // 每天凌晨 2:00 执行课时过期检查
  cron.schedule('0 2 * * *', async () => {
    await lessonExpireService.processExpiredLessons();
  });
  
  logger.info('定时任务已注册: 每天凌晨 2:00 检查过期课时');
};

module.exports = {
  createApp,
  setupDatabase,
  startServer,
  setupCronJobs
};
