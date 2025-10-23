/*
 * @Author: AI Assistant
 * @Date: 2025-10-23 
 * @Description: 为 student_coach_relations 表新增 student_name 字段
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { sequelize } = require('../src/shared/models');

/**
 * 执行迁移
 */
async function runMigration() {
  console.log('开始为师生关系表添加学员姓名字段...');
  
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 1. 添加 student_name 字段
    console.log('正在添加 student_name 字段...');
    await sequelize.query(`
      ALTER TABLE \`student_coach_relations\` 
      ADD COLUMN \`student_name\` VARCHAR(50) NULL COMMENT '学员姓名（教练可维护）' 
      AFTER \`student_id\`
    `);
    console.log('student_name 字段添加成功');

    // 2. 使用学员的 nickname 作为默认值更新现有记录
    console.log('正在更新现有记录的 student_name 字段...');
    await sequelize.query(`
      UPDATE student_coach_relations scr
      INNER JOIN users u ON scr.student_id = u.id
      SET scr.student_name = u.nickname
      WHERE scr.student_name IS NULL
    `);
    console.log('现有记录更新完成');

    // 3. 添加索引以提高查询性能
    console.log('正在添加索引...');
    await sequelize.query(`
      ALTER TABLE \`student_coach_relations\` 
      ADD INDEX \`idx_coach_student_name\` (\`coach_id\`, \`student_name\`)
    `);
    console.log('索引添加成功');

    console.log('师生关系表学员姓名字段迁移完成');

  } catch (error) {
    console.error('迁移失败:', error.message);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('迁移脚本 011_add_student_name_to_relations.js 执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
