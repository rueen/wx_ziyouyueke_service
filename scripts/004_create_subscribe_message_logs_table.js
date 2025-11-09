/**
 * 数据库迁移脚本：创建订阅消息发送记录表
 * 
 * 功能：
 * - 创建 subscribe_message_logs 表
 * - 用于记录所有订阅消息的发送情况
 * - 防止重复发送消息
 * - 便于统计和分析消息发送情况
 * 
 * 使用方法：
 * node scripts/004_create_subscribe_message_logs_table.js
 */

require('dotenv').config();
const sequelize = require('../src/shared/config/database');

async function migrate() {
  try {
    console.log('开始迁移：创建订阅消息发送记录表...\n');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subscribe_message_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
        template_id VARCHAR(100) NOT NULL COMMENT '消息模板ID',
        template_type VARCHAR(50) NOT NULL COMMENT '模板类型：BOOKING_CONFIRM-预约确认提醒, BOOKING_SUCCESS-预约成功通知',
        business_type VARCHAR(50) NOT NULL COMMENT '业务类型：course_booking-课程预约, group_course-团课等',
        business_id BIGINT UNSIGNED NOT NULL COMMENT '业务关联ID（如：course_booking_id）',
        receiver_user_id BIGINT UNSIGNED NOT NULL COMMENT '接收人用户ID',
        receiver_openid VARCHAR(100) NOT NULL COMMENT '接收人openid',
        message_data JSON NOT NULL COMMENT '消息数据内容',
        page_path VARCHAR(200) DEFAULT NULL COMMENT '跳转页面路径',
        send_status TINYINT(1) NOT NULL DEFAULT 0 COMMENT '发送状态：0-发送中，1-发送成功，2-发送失败',
        send_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
        error_code VARCHAR(50) DEFAULT NULL COMMENT '错误码',
        error_message TEXT DEFAULT NULL COMMENT '错误信息',
        retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '重试次数',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        INDEX idx_business (business_type, business_id),
        INDEX idx_receiver_user (receiver_user_id),
        INDEX idx_template_type (template_type),
        INDEX idx_send_status (send_status),
        INDEX idx_send_time (send_time),
        UNIQUE INDEX uk_business_template_receiver (business_type, business_id, template_type, receiver_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅消息发送记录表';
    `);

    console.log('✓ 创建 subscribe_message_logs 表成功');
    console.log('\n表结构说明：');
    console.log('- id: 记录ID（主键，自增）');
    console.log('- template_id: 消息模板ID');
    console.log('- template_type: 模板类型（用于分类统计）');
    console.log('- business_type: 业务类型（course_booking, group_course 等）');
    console.log('- business_id: 业务关联ID');
    console.log('- receiver_user_id: 接收人用户ID');
    console.log('- receiver_openid: 接收人openid');
    console.log('- message_data: 消息数据内容（JSON格式）');
    console.log('- page_path: 跳转页面路径');
    console.log('- send_status: 发送状态（0-发送中，1-成功，2-失败）');
    console.log('- send_time: 发送时间');
    console.log('- error_code: 错误码（失败时记录）');
    console.log('- error_message: 错误信息（失败时记录）');
    console.log('- retry_count: 重试次数');
    console.log('\n索引说明：');
    console.log('- uk_business_template_receiver: 唯一索引，防止重复发送');
    console.log('- idx_business: 业务查询索引');
    console.log('- idx_receiver_user: 用户消息查询索引');
    console.log('- idx_template_type: 模板类型统计索引');
    console.log('- idx_send_status: 发送状态查询索引');
    console.log('- idx_send_time: 时间范围查询索引');
    console.log('\n迁移完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();

