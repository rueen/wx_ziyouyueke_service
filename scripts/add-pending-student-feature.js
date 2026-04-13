/**
 * 数据库迁移脚本 - 支持教练手动录入学员（待激活关系）
 * 执行命令: node scripts/add-pending-student-feature.js
 *
 * 变更内容：
 * 1. student_coach_relations.student_id 允许为 NULL（支持待激活关系）
 * 2. 新增 pending_phone 字段（存储教练录入的未注册手机号）
 * 3. relation_status 枚举扩展：新增 2-待激活 状态
 * 4. 新增 idx_pending_phone 索引
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
    logger.info('开始执行数据库迁移：支持教练手动录入学员功能...');

    // 1. 将 student_id 改为允许 NULL
    await sequelize.query(`
      ALTER TABLE student_coach_relations
      MODIFY COLUMN student_id BIGINT UNSIGNED NULL COMMENT '学员ID（待激活关系为 NULL）';
    `);
    logger.info('✓ student_id 字段修改为允许 NULL');

    // 2. 新增 pending_phone 字段（若已存在则跳过）
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'student_coach_relations'
        AND COLUMN_NAME = 'pending_phone';
    `);

    if (columns.length === 0) {
      await sequelize.query(`
        ALTER TABLE student_coach_relations
        ADD COLUMN pending_phone VARCHAR(20) NULL
          COMMENT '待激活学员手机号（教练手动录入未注册手机号时使用，激活后清空）'
          AFTER coach_id;
      `);
      logger.info('✓ pending_phone 字段添加成功');
    } else {
      logger.info('- pending_phone 字段已存在，跳过');
    }

    // 3. 新增 pending_phone 索引（若已存在则跳过）
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'student_coach_relations'
        AND INDEX_NAME = 'idx_pending_phone';
    `);

    if (indexes.length === 0) {
      await sequelize.query(`
        ALTER TABLE student_coach_relations
        ADD INDEX idx_pending_phone (pending_phone);
      `);
      logger.info('✓ idx_pending_phone 索引创建成功');
    } else {
      logger.info('- idx_pending_phone 索引已存在，跳过');
    }

    // 4. 更新 relation_status 字段注释（仅注释，不影响数据）
    await sequelize.query(`
      ALTER TABLE student_coach_relations
      MODIFY COLUMN relation_status TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '关系状态：0-已解除，1-正常，2-待激活（教练手动录入未注册手机号）';
    `);
    logger.info('✓ relation_status 字段注释更新成功');

    logger.info('✅ 数据库迁移完成：教练手动录入学员功能');
  } catch (error) {
    logger.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
