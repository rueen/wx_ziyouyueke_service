/*
 * @Author: diaochan
 * @Date: 2025-01-09 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-09 00:00:00
 * @Description: 创建团课报名表
 */

const { sequelize } = require('../src/shared/models');

async function createGroupCourseRegistrationsTable() {
  console.log('开始创建团课报名表 (group_course_registrations)...');
  
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`group_course_registrations\` (
        \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '报名ID',
        \`group_course_id\` bigint(20) unsigned NOT NULL COMMENT '团课ID',
        \`student_id\` bigint(20) unsigned NOT NULL COMMENT '学员ID',
        \`coach_id\` bigint(20) unsigned NOT NULL COMMENT '教练ID（冗余字段，便于查询）',
        \`relation_id\` bigint(20) unsigned DEFAULT NULL COMMENT '师生关系ID（仅学员报名时有值，enrollment_scope=1时必填）',
        
        -- 报名状态
        \`registration_status\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '报名状态：1-已报名，2-已取消',
        
        -- 支付信息
        \`payment_type\` tinyint(1) NOT NULL COMMENT '支付方式：1-课时，2-金额，3-免费',
        \`lesson_deducted\` int(11) DEFAULT 0 COMMENT '已扣除的课时数（签到时扣除）',
        \`amount_paid\` decimal(10,2) DEFAULT 0.00 COMMENT '支付金额（前期仅记录，不实际支付）',
        \`payment_status\` tinyint(1) DEFAULT 0 COMMENT '支付状态：0-待支付（报名阶段），1-已支付（签到后），2-已退款',
        
        -- 签到相关（签到即完成）
        \`check_in_status\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '签到状态：0-未签到，1-已签到，2-缺席',
        \`check_in_time\` datetime DEFAULT NULL COMMENT '签到时间',
        \`checked_in_by\` bigint(20) unsigned DEFAULT NULL COMMENT '签到操作人ID（教练ID或学员ID）',
        
        -- 时间管理
        \`registered_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
        \`cancelled_at\` datetime DEFAULT NULL COMMENT '取消时间',
        \`cancel_reason\` varchar(200) DEFAULT NULL COMMENT '取消原因',
        \`cancelled_by\` bigint(20) unsigned DEFAULT NULL COMMENT '取消操作人ID',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_course_student\` (\`group_course_id\`, \`student_id\`),
        KEY \`idx_student_id\` (\`student_id\`),
        KEY \`idx_coach_id\` (\`coach_id\`),
        KEY \`idx_relation_id\` (\`relation_id\`),
        KEY \`idx_registration_status\` (\`registration_status\`),
        KEY \`idx_check_in_status\` (\`check_in_status\`),
        KEY \`idx_payment_type\` (\`payment_type\`),
        KEY \`idx_student_status\` (\`student_id\`, \`registration_status\`),
        KEY \`idx_course_status\` (\`group_course_id\`, \`registration_status\`),
        KEY \`idx_coach_status\` (\`coach_id\`, \`registration_status\`),
        
        CONSTRAINT \`fk_group_registrations_course\` FOREIGN KEY (\`group_course_id\`) REFERENCES \`group_courses\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_group_registrations_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_group_registrations_coach\` FOREIGN KEY (\`coach_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_group_registrations_relation\` FOREIGN KEY (\`relation_id\`) REFERENCES \`student_coach_relations\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团课报名表'
    `);
    
    console.log('团课报名表创建成功');
    
  } catch (error) {
    console.error('创建团课报名表失败:', error.message);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  createGroupCourseRegistrationsTable()
    .then(() => {
      console.log('迁移脚本 009_create_group_course_registrations.js 执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createGroupCourseRegistrationsTable };
