/*
 * @Author: AI Assistant
 * @Date: 2025-10-26
 * @Description: 为 users 表新增专业认证、格言、海报图片字段
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
  console.log('开始为用户表添加个人资料字段...');
  
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 1. 添加 certification 字段（专业认证）
    console.log('正在添加 certification 字段...');
    await sequelize.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`certification\` TEXT NULL COMMENT '专业认证（如：国际健身教练认证、瑜伽教练资格证等）' 
      AFTER \`intro\`
    `);
    console.log('certification 字段添加成功');

    // 2. 添加 motto 字段（格言）
    console.log('正在添加 motto 字段...');
    await sequelize.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`motto\` VARCHAR(200) NULL COMMENT '格言/座右铭' 
      AFTER \`certification\`
    `);
    console.log('motto 字段添加成功');

    // 3. 添加 poster_image 字段（海报图片）
    console.log('正在添加 poster_image 字段...');
    await sequelize.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`poster_image\` VARCHAR(500) NULL COMMENT '海报图片URL' 
      AFTER \`motto\`
    `);
    console.log('poster_image 字段添加成功');

    console.log('用户表个人资料字段迁移完成');

  } catch (error) {
    console.error('迁移失败:', error.message);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('迁移脚本 012_add_user_profile_fields.js 执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
