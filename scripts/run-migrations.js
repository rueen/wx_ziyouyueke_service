require('dotenv').config();
const sequelize = require('../src/shared/config/database');
const Waiter = require('../src/shared/models/Waiter');
const logger = require('../src/shared/utils/logger');

/**
 * 运行数据库迁移
 */
const runMigrations = async () => {
  try {
    logger.info('开始运行数据库迁移...');
    
    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步所有模型
    await sequelize.sync({ alter: true });
    logger.info('数据库模型同步完成');
    
    // 创建默认管理员账号
    await Waiter.createDefaultAdmin();
    logger.info('默认管理员账号检查完成');

    logger.info('数据库迁移完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    process.exit(1);
  }
};

runMigrations();
