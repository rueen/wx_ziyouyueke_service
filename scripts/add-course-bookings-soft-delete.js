/**
 * 数据库迁移脚本 - course_bookings 表改为软删除
 * 执行命令: node scripts/add-course-bookings-soft-delete.js
 *
 * 变更内容：
 * - course_bookings 表新增 deleted_at DATETIME 字段（NULL 表示未删除）
 * - 新增 idx_deleted_at 索引，提升软删除过滤性能
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
    logger.info('开始执行数据库迁移：course_bookings 表新增 deleted_at 字段...');

    // 检查字段是否已存在
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_bookings'
        AND COLUMN_NAME = 'deleted_at';
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE course_bookings
        ADD COLUMN deleted_at DATETIME NULL
          COMMENT '软删除时间（非 NULL 表示已删除）'
          AFTER complete_at;
      `);
      logger.info('✓ deleted_at 字段添加成功');
    } else {
      logger.info('- deleted_at 字段已存在，跳过');
    }

    // 检查索引是否已存在
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'course_bookings'
        AND INDEX_NAME = 'idx_deleted_at';
    `);

    if (indexes.length === 0) {
      await sequelize.query(`
        ALTER TABLE course_bookings
        ADD INDEX idx_deleted_at (deleted_at);
      `);
      logger.info('✓ idx_deleted_at 索引创建成功');
    } else {
      logger.info('- idx_deleted_at 索引已存在，跳过');
    }

    logger.info('✅ 数据库迁移完成：course_bookings 软删除支持已就绪');
  } catch (error) {
    logger.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
