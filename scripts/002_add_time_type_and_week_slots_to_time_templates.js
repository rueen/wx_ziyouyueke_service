/*
 * @Author: diaochan
 * @Date: 2025-11-04 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-11-04 10:00:00
 * @Description: 为 time_templates 表添加 time_type 和 week_slots 字段，并设置老数据默认值
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { execSync } = require('child_process');

/**
 * 添加 time_type 和 week_slots 字段到 time_templates 表
 */
async function addTimeTypeAndWeekSlotsFields() {
  try {
    console.log('开始为 time_templates 表添加 time_type 和 week_slots 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查 time_type 字段是否已存在
    const checkTimeTypeCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'time_templates' AND COLUMN_NAME = 'time_type';"`;
    
    let timeTypeExists = false;
    try {
      const checkResult = execSync(checkTimeTypeCmd, { encoding: 'utf8' });
      if (checkResult.includes('time_type')) {
        console.log('字段 time_type 已存在，跳过添加');
        timeTypeExists = true;
      }
    } catch (error) {
      console.log('检查 time_type 字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 检查 week_slots 字段是否已存在
    const checkWeekSlotsCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'time_templates' AND COLUMN_NAME = 'week_slots';"`;
    
    let weekSlotsExists = false;
    try {
      const checkResult = execSync(checkWeekSlotsCmd, { encoding: 'utf8' });
      if (checkResult.includes('week_slots')) {
        console.log('字段 week_slots 已存在，跳过添加');
        weekSlotsExists = true;
      }
    } catch (error) {
      console.log('检查 week_slots 字段存在性时出现错误，继续执行添加操作...');
    }

    // 3. 添加 time_type 字段
    if (!timeTypeExists) {
      const addTimeTypeCmd = `${mysqlCmd} -e "ALTER TABLE time_templates ADD COLUMN time_type TINYINT(1) NOT NULL DEFAULT 0 COMMENT '时间类型：0-全日程统一模板，1-按周历循环模板，2-自由日程模板' AFTER is_active;"`;
      
      execSync(addTimeTypeCmd, { stdio: 'inherit' });
      console.log('字段 time_type 添加成功');
    }

    // 4. 添加 week_slots 字段
    if (!weekSlotsExists) {
      const addWeekSlotsCmd = `${mysqlCmd} -e "ALTER TABLE time_templates ADD COLUMN week_slots JSON DEFAULT NULL COMMENT '周历时间段配置，格式：[{\"id\":0,\"text\":\"周日\",\"checked\":true,\"time_slots\":[...]}]' AFTER time_type;"`;
      
      execSync(addWeekSlotsCmd, { stdio: 'inherit' });
      console.log('字段 week_slots 添加成功');
    }

    // 5. 更新现有数据：time_type 默认为 0，week_slots 默认为 null
    // 注意：time_type 是 NOT NULL DEFAULT 0，添加字段时老数据会自动设置为 0，无需额外更新
    // 但为了确保数据一致性，仍然更新一次（虽然可能没有需要更新的记录）
    if (!timeTypeExists) {
      try {
        const updateTimeTypeCmd = `${mysqlCmd} -e "UPDATE time_templates SET time_type = 0 WHERE time_type IS NULL;"`;
        execSync(updateTimeTypeCmd, { stdio: 'inherit' });
        console.log('已确保现有记录的 time_type 字段为 0');
      } catch (error) {
        console.log('更新 time_type 字段时出现错误（可能字段已自动设置），继续执行...');
      }
    }

    // week_slots 字段默认值为 NULL，添加字段时老数据会自动设置为 NULL，无需额外更新
    if (!weekSlotsExists) {
      console.log('week_slots 字段默认值为 NULL，现有记录已自动设置为 NULL');
    }

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addTimeTypeAndWeekSlotsFields()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addTimeTypeAndWeekSlotsFields;

