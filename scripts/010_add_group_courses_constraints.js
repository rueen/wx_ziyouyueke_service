/*
 * @Author: diaochan
 * @Date: 2025-01-09 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-09 00:00:00
 * @Description: 为团课表添加业务约束（简化版本，移除了registration_time相关约束）
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { sequelize } = require('../src/shared/models');

async function addGroupCoursesConstraints() {
  console.log('开始为团课表添加业务约束...');
  
  try {
    // 添加逻辑性约束（必须添加）
    console.log('添加逻辑性约束...');
    await sequelize.query(`
      ALTER TABLE \`group_courses\` 
      ADD CONSTRAINT \`chk_min_max_participants\` CHECK (\`min_participants\` <= \`max_participants\`)
    `);
    
    await sequelize.query(`
      ALTER TABLE \`group_courses\` 
      ADD CONSTRAINT \`chk_time_order\` CHECK (\`start_time\` < \`end_time\`)
    `);
    
    // 添加业务规则约束（推荐添加）
    console.log('添加业务规则约束...');
    await sequelize.query(`
      ALTER TABLE \`group_courses\` 
      ADD CONSTRAINT \`chk_lesson_cost\` CHECK ((\`price_type\` = 1 AND \`lesson_cost\` > 0) OR \`price_type\` != 1)
    `);
    
    await sequelize.query(`
      ALTER TABLE \`group_courses\` 
      ADD CONSTRAINT \`chk_price_amount\` CHECK ((\`price_type\` = 2 AND \`price_amount\` > 0) OR \`price_type\` != 2)
    `);
    
    // 添加状态约束（可选添加）
    console.log('添加状态约束...');
    await sequelize.query(`
      ALTER TABLE \`group_courses\` 
      ADD CONSTRAINT \`chk_participants\` CHECK (\`current_participants\` <= \`max_participants\`)
    `);
    
    console.log('团课表约束添加成功');
    
  } catch (error) {
    console.error('添加团课表约束失败:', error.message);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addGroupCoursesConstraints()
    .then(() => {
      console.log('迁移脚本 010_add_group_courses_constraints_simplified.js 执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { addGroupCoursesConstraints };
