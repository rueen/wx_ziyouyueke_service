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
    }
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
 * 数据库连接和同步
 */
const setupDatabase = async (options = {}) => {
  const sequelize = require('./config/database');
  const { createDefaultAdmin = false, skipSync = false } = options;

  try {
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 开发环境同步数据库模型（避免并发冲突）
    if (process.env.NODE_ENV === 'development') {
      if (skipSync) {
        // 跳过数据库同步，只验证连接
        logger.info('跳过数据库同步，仅验证连接');
      } else {
        // 执行数据库同步
        try {
          // 先尝试检查表是否存在，如果已存在则跳过完整同步
          const tables = await sequelize.getQueryInterface().showAllTables();
          const hasWaitersTable = tables.includes('waiters');
          
          if (!hasWaitersTable) {
            // 只有当核心表不存在时才进行完整同步
            await sequelize.sync({ alter: true });
            logger.info('数据库模型同步完成');
          } else {
            // 表已存在，使用更温和的同步方式
            await sequelize.sync({ alter: false });
            logger.info('数据库结构验证完成');
          }
        } catch (syncError) {
          // 如果同步失败，可能是因为并发冲突，记录警告但不中断启动
          logger.warn('数据库同步遇到问题（可能是并发冲突）:', syncError.message);
          logger.info('尝试继续启动服务...');
        }

        // 创建默认管理员账号（仅管理端需要）
        if (createDefaultAdmin) {
          try {
            const Waiter = require('./models/Waiter');
            await Waiter.createDefaultAdmin();
          } catch (adminError) {
            logger.warn('创建默认管理员账号失败:', adminError.message);
          }
        }
      }
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

module.exports = {
  createApp,
  setupDatabase,
  startServer
};
