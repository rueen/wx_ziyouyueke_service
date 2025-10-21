/*
 * @Author: diaochan
 * @Date: 2025-01-09 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-09 00:00:00
 * @Description: 创建团课表（简化版本，整合了011脚本的简化逻辑，移除了is_published字段）
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { sequelize } = require('../src/shared/models');

async function createGroupCoursesTable() {
  console.log('开始创建团课表 (group_courses)...');
  
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`group_courses\` (
        \`id\` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '团课ID',
        \`coach_id\` bigint(20) unsigned NOT NULL COMMENT '教练ID',
        \`category_id\` bigint(20) unsigned NOT NULL DEFAULT 0 COMMENT '课程分类ID（对应教练的course_categories）',
        \`title\` varchar(100) NOT NULL COMMENT '团课标题',
        \`content\` longtext COMMENT '团课活动详情（支持富文本格式）',
        \`cover_images\` json COMMENT '封面图片数组，格式：["url1", "url2"]',
        \`images\` json COMMENT '活动详情图片数组，格式：["url1", "url2"]',
        
        -- 时间相关
        \`course_date\` date NOT NULL COMMENT '上课日期（YYYY-MM-DD）',
        \`start_time\` time NOT NULL COMMENT '开始时间（HH:mm）',
        \`end_time\` time NOT NULL COMMENT '结束时间（HH:mm）',
        \`duration\` int(11) DEFAULT NULL COMMENT '课程时长（分钟）',
        
        -- 地点相关
        \`address_id\` bigint(20) unsigned DEFAULT NULL COMMENT '地址ID（关联addresses表）',
        
        -- 容量管理
        \`max_participants\` int(11) NOT NULL DEFAULT 10 COMMENT '最大参与人数',
        \`min_participants\` int(11) NOT NULL DEFAULT 1 COMMENT '最小开课人数',
        \`current_participants\` int(11) NOT NULL DEFAULT 0 COMMENT '当前报名人数',
        
        -- 费用相关
        \`price_type\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '收费方式：1-扣课时，2-金额展示（暂不真实支付），3-免费',
        \`lesson_cost\` int(11) DEFAULT 1 COMMENT '扣除课时数（price_type=1时有效）',
        \`price_amount\` decimal(10,2) DEFAULT 0.00 COMMENT '费用金额（前期仅记录，不实际支付）',
        
        -- 报名设置（简化版本）
        \`enrollment_scope\` tinyint(1) NOT NULL DEFAULT 1 COMMENT '报名范围：1-仅学员可报名，2-所有人可报名',
        
        -- 状态管理（简化版本）
        \`status\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '课程状态：0-待发布，1-报名中，2-已结束（已取消、人数不足取消、已完成等）',
        
        -- 时间戳
        \`published_at\` datetime DEFAULT NULL COMMENT '发布时间',
        \`cancelled_at\` datetime DEFAULT NULL COMMENT '取消时间',
        \`cancel_reason\` varchar(200) DEFAULT NULL COMMENT '取消原因',
        \`completed_at\` datetime DEFAULT NULL COMMENT '完成时间',
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        
        PRIMARY KEY (\`id\`),
        KEY \`idx_coach_id\` (\`coach_id\`),
        KEY \`idx_category_id\` (\`category_id\`),
        KEY \`idx_course_date\` (\`course_date\`),
        KEY \`idx_status\` (\`status\`),
        KEY \`idx_enrollment_scope\` (\`enrollment_scope\`),
        KEY \`idx_coach_status\` (\`coach_id\`, \`status\`),
        KEY \`idx_date_status\` (\`course_date\`, \`status\`),
        KEY \`idx_scope_status\` (\`enrollment_scope\`, \`status\`),
        KEY \`idx_address_id\` (\`address_id\`),
        
        CONSTRAINT \`fk_group_courses_coach\` FOREIGN KEY (\`coach_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_group_courses_address\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团课表'
    `);
    
    console.log('团课表创建成功');
    
  } catch (error) {
    console.error('创建团课表失败:', error.message);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  createGroupCoursesTable()
    .then(() => {
      console.log('迁移脚本 008_create_group_courses_simplified.js 执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createGroupCoursesTable };
