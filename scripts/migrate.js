require('dotenv').config();
const sequelize = require('../config/database');
const logger = require('../utils/logger');

// 引入所有模型以确保关联关系被设置
require('../models');

/**
 * 数据库迁移脚本
 */
const migrate = async () => {
  try {
    logger.info('开始数据库迁移...');

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });
    logger.info('数据库模型同步完成');

    logger.info('数据库迁移完成');
    process.exit(0);
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    process.exit(1);
  }
};

// 执行迁移
migrate(); 