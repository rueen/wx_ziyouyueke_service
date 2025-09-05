/*
 * @Author: diaochan
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 10:00:00
 * @Description: 为 time_templates 表添加 max_advance_nums 字段，并设置老数据默认值为1
 */

const { QueryTypes } = require('sequelize');
const sequelize = require('../src/shared/config/database');

/**
 * 添加 max_advance_nums 字段到 time_templates 表
 */
async function addMaxAdvanceNumsField() {
  try {
    console.log('开始为 time_templates 表添加 max_advance_nums 字段...');

    // 检查字段是否已存在
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'time_templates' 
      AND COLUMN_NAME = 'max_advance_nums'
    `, { type: QueryTypes.SELECT });

    if (results && results.length > 0) {
      console.log('字段 max_advance_nums 已存在，跳过添加');
      return;
    }

    // 添加字段
    await sequelize.query(`
      ALTER TABLE time_templates 
      ADD COLUMN max_advance_nums INT NOT NULL DEFAULT 1 
      COMMENT '同时段最多可预约人数' 
      AFTER max_advance_days
    `);

    console.log('字段 max_advance_nums 添加成功');

    // 更新现有数据，确保所有记录的 max_advance_nums 都为 1
    const [updateResult] = await sequelize.query(`
      UPDATE time_templates 
      SET max_advance_nums = 1 
      WHERE max_advance_nums IS NULL OR max_advance_nums = 0
    `);

    console.log(`已更新 ${updateResult.affectedRows || 0} 条记录的 max_advance_nums 字段`);

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addMaxAdvanceNumsField()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addMaxAdvanceNumsField;
