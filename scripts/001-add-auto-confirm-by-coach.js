/*
 * @Author: diaochan
 * @Date: 2025-11-13
 * @Description: 为 student_coach_relations 表添加 auto_confirm_by_coach 字段
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { Sequelize } = require('sequelize');
const config = require('../src/shared/config/database');

/**
 * 为 student_coach_relations 表添加 auto_confirm_by_coach 字段
 */
async function addAutoConfirmByCoachField() {
  const sequelize = new Sequelize(
    config.options.database,
    config.options.username,
    config.options.password,
    {
      host: config.options.host,
      port: config.options.port,
      dialect: config.options.dialect,
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${config.options.database}' 
        AND TABLE_NAME = 'student_coach_relations' 
        AND COLUMN_NAME = 'auto_confirm_by_coach'
    `);

    if (results.length > 0) {
      console.log('字段 auto_confirm_by_coach 已存在，跳过添加');
      return;
    }

    // 添加字段
    console.log('开始添加字段 auto_confirm_by_coach...');
    await sequelize.query(`
      ALTER TABLE student_coach_relations 
      ADD COLUMN auto_confirm_by_coach TINYINT(1) NOT NULL DEFAULT 0 
      COMMENT '该教练发起的课程预约自动确认：0-需要确认，1-自动确认' 
      AFTER booking_reopened_at
    `);

    console.log('字段 auto_confirm_by_coach 添加成功');

    // 更新所有老数据为默认值 0（实际上字段已经有默认值，这里只是明确处理）
    const [updateResult] = await sequelize.query(`
      UPDATE student_coach_relations 
      SET auto_confirm_by_coach = 0 
      WHERE auto_confirm_by_coach IS NULL
    `);

    console.log(`老数据更新完成，影响行数: ${updateResult.affectedRows || 0}`);

  } catch (error) {
    console.error('迁移失败:', error.message);
    throw error;
  } finally {
    await sequelize.close();
    console.log('数据库连接已关闭');
  }
}

// 执行迁移
addAutoConfirmByCoachField()
  .then(() => {
    console.log('迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });

