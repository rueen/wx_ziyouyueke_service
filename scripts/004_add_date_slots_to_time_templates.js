/*
 * @Author: diaochan
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 10:00:00
 * @Description: 为 time_templates 表添加 date_slots 字段，并设置默认值
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 date_slots 字段到 time_templates 表
 */
async function addDateSlotsField() {
  try {
    console.log('开始为 time_templates 表添加 date_slots 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'time_templates' AND COLUMN_NAME = 'date_slots';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('date_slots')) {
        console.log('字段 date_slots 已存在，跳过添加');
        return;
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 添加字段（JSON 字段不能直接设置复杂的默认值，先添加字段）
    const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE time_templates ADD COLUMN date_slots JSON COMMENT '可预约日期配置，格式：[{\"id\":0,\"text\":\"周日\",\"checked\":true}]' AFTER time_slots;"`;
    
    execSync(addFieldCmd, { stdio: 'inherit' });
    console.log('字段 date_slots 添加成功');

    // 3. 更新现有数据，为所有记录设置默认的 date_slots 值
    const defaultDateSlots = JSON.stringify([
      { id: 0, text: '周日', checked: true },
      { id: 1, text: '周一', checked: true },
      { id: 2, text: '周二', checked: true },
      { id: 3, text: '周三', checked: true },
      { id: 4, text: '周四', checked: true },
      { id: 5, text: '周五', checked: true },
      { id: 6, text: '周六', checked: true }
    ]);

    // 转义 JSON 字符串中的双引号，避免 shell 命令解析错误
    const escapedJson = defaultDateSlots.replace(/"/g, '\\"');
    const updateCmd = `${mysqlCmd} -e "UPDATE time_templates SET date_slots = '${escapedJson}' WHERE date_slots IS NULL;"`;
    
    execSync(updateCmd, { stdio: 'inherit' });
    console.log('已更新现有记录的 date_slots 字段');

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addDateSlotsField()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addDateSlotsField;
