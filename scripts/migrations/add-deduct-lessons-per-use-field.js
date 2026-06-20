/**
 * 添加课程卡单次销课扣减课时字段的数据库迁移脚本
 *
 * 功能：为 student_card_instances 表添加 deduct_lessons_per_use 字段
 * 用途：教练发卡时可配置每次销课固定扣除的课时数，默认 1，用于支持「带多人上课」场景
 *
 * 使用方法：
 * node scripts/migrations/add-deduct-lessons-per-use-field.js
 */

try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const sequelize = require('../../src/shared/config/database');
const logger = require('../../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行单次销课扣减课时字段迁移...');

    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'student_card_instances'
        AND COLUMN_NAME = 'deduct_lessons_per_use'
    `);

    if (results.length > 0) {
      logger.info('✓ deduct_lessons_per_use 字段已存在，跳过迁移');
      return;
    }

    await sequelize.query(`
      ALTER TABLE student_card_instances
      ADD COLUMN deduct_lessons_per_use INT UNSIGNED NOT NULL DEFAULT 1
      COMMENT '单次销课扣减课时数：每次预约完成或团课签到时从卡内扣除的课时数，默认 1'
      AFTER used_count
    `);

    logger.info('✓ deduct_lessons_per_use 字段添加成功');
    logger.info('迁移完成！');
    logger.info('');
    logger.info('已添加的字段：');
    logger.info('  - student_card_instances.deduct_lessons_per_use: 单次销课扣减课时数（INT UNSIGNED，默认 1）');
    logger.info('');
    logger.info('说明：');
    logger.info('  - 默认值为 1，与原有行为完全兼容');
    logger.info('  - 教练发卡时可设置大于 1 的值，适用于带多名孩子上课的场景');
    logger.info('  - 该字段同时作用于一对一课程（booking_type=2）和团课（payment_type=4）的扣减逻辑');

  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('所有迁移执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移执行失败:', error);
      process.exit(1);
    });
}

module.exports = migrate;
