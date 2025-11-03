/**
 * 数据库迁移脚本：为师生关系表添加约课状态字段
 * 
 * 新增字段：
 * - booking_status: 约课状态，1-开启，0-关闭
 * - booking_closed_at: 约课关闭时间
 * - booking_reopened_at: 最近一次重新开启时间
 */

const { sequelize } = require('../src/shared/models');
const logger = require('../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行迁移：添加约课状态字段...');

    // 1. 添加 booking_status 字段
    await sequelize.query(`
      ALTER TABLE student_coach_relations 
      ADD COLUMN booking_status TINYINT(1) NOT NULL DEFAULT 1 
      COMMENT '约课状态：1-开启，0-关闭' 
      AFTER relation_status
    `);
    logger.info('✓ 添加 booking_status 字段成功');

    // 2. 添加 booking_closed_at 字段
    await sequelize.query(`
      ALTER TABLE student_coach_relations 
      ADD COLUMN booking_closed_at DATETIME NULL 
      COMMENT '约课关闭时间' 
      AFTER booking_status
    `);
    logger.info('✓ 添加 booking_closed_at 字段成功');

    // 3. 添加 booking_reopened_at 字段
    await sequelize.query(`
      ALTER TABLE student_coach_relations 
      ADD COLUMN booking_reopened_at DATETIME NULL 
      COMMENT '最近一次重新开启时间' 
      AFTER booking_closed_at
    `);
    logger.info('✓ 添加 booking_reopened_at 字段成功');

    // 4. 添加索引以提升查询效率
    await sequelize.query(`
      ALTER TABLE student_coach_relations 
      ADD INDEX idx_booking_status (booking_status)
    `);
    logger.info('✓ 添加 booking_status 索引成功');

    logger.info('迁移完成！');
  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  }
}

// 执行迁移
migrate()
  .then(() => {
    logger.info('所有迁移任务执行成功');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('迁移执行失败:', error);
    process.exit(1);
  });

