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
const path = require('path');

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

    // 执行 SQL 文件
    const sqlFile = path.join(__dirname, '003_add_max_advance_nums_to_time_templates.sql');
    const executeCmd = `${mysqlCmd} < ${sqlFile}`;
    
    execSync(executeCmd, { stdio: 'inherit' });
    console.log('字段 max_advance_nums 添加成功');

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
