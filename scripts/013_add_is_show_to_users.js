/*
 * @Author: diaochan
 * @Date: 2025-10-28 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-10-28 10:00:00
 * @Description: 为 users 表添加 is_show 字段（是否在教练大厅展示），并设置老数据默认值为 true
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 is_show 字段到 users 表
 */
async function addIsShowField() {
  try {
    console.log('开始为 users 表添加 is_show 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_show';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('is_show')) {
        console.log('字段 is_show 已存在，跳过添加');
        return;
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 添加字段
    const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE users ADD COLUMN is_show TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在教练大厅展示：0-否，1-是' AFTER status;"`;
    
    execSync(addFieldCmd, { stdio: 'inherit' });
    console.log('字段 is_show 添加成功');

    // 3. 更新现有数据，确保所有老数据为 true (1)
    const updateCmd = `${mysqlCmd} -e "UPDATE users SET is_show = 1 WHERE is_show IS NULL OR is_show = 0;"`;
    
    execSync(updateCmd, { stdio: 'inherit' });
    console.log('已更新现有记录的 is_show 字段为 true');

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addIsShowField()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addIsShowField;

