/**
 * 数据库迁移脚本 - 新增取消次数限制配置表
 * 执行命令: node scripts/add-cancellation-settings.js
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
    logger.info('开始执行数据库迁移：新增 cancellation_settings 表...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS cancellation_settings (
        id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '主键',
        coach_id BIGINT UNSIGNED NOT NULL UNIQUE COMMENT '教练ID（FK → users.id），一个教练只有一条配置',
        is_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用：0-关闭，1-开启',
        time_window ENUM('day','week','month','quarter','year') NOT NULL DEFAULT 'week' COMMENT '统计周期：自然日/周/月/季度/年',
        max_count INT NOT NULL DEFAULT 3 COMMENT '周期内学员最多可取消次数',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_coach_id (coach_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教练取消次数限制配置表';
    `);
    logger.info('✓ cancellation_settings 表创建成功');

    logger.info('✅ 数据库迁移完成');
  } catch (error) {
    logger.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
