/**
 * 添加自由日程时间范围字段的数据库迁移脚本
 * 
 * 功能：为 time_templates 表添加 free_time_range 字段
 * 用途：支持 time_type 为 2 时的自由日程模板
 * 
 * 使用方法：
 * node scripts/migrations/add-free-time-range-field.js
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const sequelize = require('../../src/shared/config/database');
const logger = require('../../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行自由日程时间范围字段迁移...');

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'time_templates' 
        AND COLUMN_NAME = 'free_time_range'
    `);

    if (results.length > 0) {
      logger.info('✓ free_time_range 字段已存在，跳过迁移');
      return;
    }

    // 添加 free_time_range 字段
    await sequelize.query(`
      ALTER TABLE time_templates 
      ADD COLUMN free_time_range JSON NULL 
      COMMENT '自由日程时间范围，仅 time_type 为 2 时使用，格式：{"startTime":"09:00","endTime":"18:00"}' 
      AFTER week_slots
    `);

    logger.info('✓ free_time_range 字段添加成功');

    logger.info('迁移完成！');
    logger.info('');
    logger.info('已添加的字段：');
    logger.info('  - time_templates.free_time_range: 自由日程时间范围（JSON）');
    logger.info('');
    logger.info('功能说明：');
    logger.info('  - 当 time_type = 0 时，使用 time_slots 字段（全日程统一模板）');
    logger.info('  - 当 time_type = 1 时，使用 week_slots 字段（按周历循环模板）');
    logger.info('  - 当 time_type = 2 时，使用 free_time_range 字段（自由日程模板）');
    logger.info('  - free_time_range 格式：{"startTime":"09:00","endTime":"18:00"}');
    logger.info('  - 学员可在该时间范围内自由选择任意时间段进行预约');
    
  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 如果直接运行此脚本
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

