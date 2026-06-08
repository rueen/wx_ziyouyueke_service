/**
 * 添加团课签到方式字段的数据库迁移脚本
 *
 * 功能：为 coach_settings 表添加 group_checkin_method 字段
 * 用途：支持教练配置活动（团课）的签到方式：扫码签到 or 按钮签到
 *
 * 使用方法：
 * node scripts/migrations/add-group-checkin-method-field.js
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
    logger.info('开始执行团课签到方式字段迁移...');

    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'coach_settings'
        AND COLUMN_NAME = 'group_checkin_method'
    `);

    if (results.length > 0) {
      logger.info('✓ group_checkin_method 字段已存在，跳过迁移');
      return;
    }

    await sequelize.query(`
      ALTER TABLE coach_settings
      ADD COLUMN group_checkin_method VARCHAR(50) NOT NULL DEFAULT 'scan'
      COMMENT '团课签到方式：scan-扫码签到，button-按钮签到'
      AFTER completion_method
    `);

    logger.info('✓ group_checkin_method 字段添加成功');
    logger.info('迁移完成！');
    logger.info('');
    logger.info('已添加的字段：');
    logger.info('  - coach_settings.group_checkin_method: 团课签到方式（VARCHAR 50，默认 scan）');
    logger.info('');
    logger.info('枚举值说明：');
    logger.info('  - scan：扫码签到（默认）');
    logger.info('  - button：学员自主按钮签到');

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
