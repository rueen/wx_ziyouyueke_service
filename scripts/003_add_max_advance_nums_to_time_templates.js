/*
 * @Author: diaochan
 * @Date: 2025-01-27 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 10:00:00
 * @Description: 为 time_templates 表添加 max_advance_nums 字段，并设置老数据默认值为1
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 max_advance_nums 字段到 time_templates 表
 */
async function addMaxAdvanceNumsField() {
  try {
    console.log('开始为 time_templates 表添加 max_advance_nums 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'time_templates' AND COLUMN_NAME = 'max_advance_nums';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('max_advance_nums')) {
        console.log('字段 max_advance_nums 已存在，跳过添加');
        return;
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 添加字段
    const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE time_templates ADD COLUMN max_advance_nums INT NOT NULL DEFAULT 1 COMMENT '同时段最多可预约人数' AFTER max_advance_days;"`;
    
    execSync(addFieldCmd, { stdio: 'inherit' });
    console.log('字段 max_advance_nums 添加成功');

    // 3. 更新现有数据
    const updateCmd = `${mysqlCmd} -e "UPDATE time_templates SET max_advance_nums = 1 WHERE max_advance_nums IS NULL OR max_advance_nums = 0;"`;
    
    execSync(updateCmd, { stdio: 'inherit' });
    console.log('已更新现有记录的 max_advance_nums 字段');

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
