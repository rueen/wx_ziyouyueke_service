/**
 * 数据库迁移脚本：创建用户订阅消息配额表
 * 
 * 功能：
 * - 创建 user_subscribe_quotas 表
 * - 用于记录用户对各类型订阅消息的剩余次数
 * - 配合前端授权管理，实现余量统计和提示
 * 
 * 使用方法：
 * node scripts/005_create_user_subscribe_quotas_table.js
 */

require('dotenv').config();
const sequelize = require('../src/shared/config/database');

async function migrate() {
  try {
    console.log('开始迁移：创建用户订阅消息配额表...\n');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_subscribe_quotas (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
        user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
        template_type VARCHAR(50) NOT NULL COMMENT '模板类型：BOOKING_CONFIRM, BOOKING_SUCCESS 等',
        template_id VARCHAR(100) NOT NULL COMMENT '微信模板ID',
        remaining_quota INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '剩余可发送次数',
        total_quota INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总授权次数（累计）',
        last_authorized_at DATETIME DEFAULT NULL COMMENT '最近一次授权时间',
        last_sent_at DATETIME DEFAULT NULL COMMENT '最近一次发送时间',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        UNIQUE INDEX uk_user_template (user_id, template_type),
        INDEX idx_user_id (user_id),
        INDEX idx_template_type (template_type),
        INDEX idx_remaining_quota (remaining_quota)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅消息配额表';
    `);

    console.log('✓ 创建 user_subscribe_quotas 表成功');
    console.log('\n表结构说明：');
    console.log('- id: 记录ID（主键，自增）');
    console.log('- user_id: 用户ID');
    console.log('- template_type: 模板类型枚举（BOOKING_CONFIRM, BOOKING_SUCCESS 等）');
    console.log('- template_id: 微信模板ID');
    console.log('- remaining_quota: 剩余可发送次数');
    console.log('- total_quota: 总授权次数（累计值）');
    console.log('- last_authorized_at: 最近一次授权时间');
    console.log('- last_sent_at: 最近一次发送时间');
    console.log('\n索引说明：');
    console.log('- uk_user_template: 唯一索引，确保每个用户每种模板只有一条记录');
    console.log('- idx_user_id: 用户查询索引');
    console.log('- idx_template_type: 模板类型查询索引');
    console.log('- idx_remaining_quota: 余量统计索引');
    console.log('\n迁移完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();

