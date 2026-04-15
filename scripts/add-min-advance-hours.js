/**
 * 数据库迁移脚本 - 时间模板新增最短提前预约时间字段
 * 执行命令: node scripts/add-min-advance-hours.js
 *
 * 变更内容：
 * - time_templates 表新增 min_advance_hours INT 字段（默认 0，表示不限制）
 */

try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { sequelize } = require('../src/shared/models');
const logger = require('../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行数据库迁移：time_templates 新增 min_advance_hours 字段...');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'time_templates'
        AND COLUMN_NAME = 'min_advance_hours';
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE time_templates
        ADD COLUMN min_advance_hours INT NOT NULL DEFAULT 0
          COMMENT '最短提前预约时间（小时），0 表示不限制'
          AFTER min_advance_days;
      `);
      logger.info('✓ min_advance_hours 字段添加成功');
    } else {
      logger.info('- min_advance_hours 字段已存在，跳过');
    }

    logger.info('✅ 数据库迁移完成');
  } catch (error) {
    logger.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
