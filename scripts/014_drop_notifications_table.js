/*
 * @Author: diaochan
 * @Date: 2025-10-28 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-10-28 10:00:00
 * @Description: 删除 notifications 表（如果表为空）
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 删除 notifications 表（仅在表为空时执行）
 */
async function dropNotificationsTable() {
  try {
    console.log('开始检查 notifications 表...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查表是否存在
    const checkTableCmd = `${mysqlCmd} -e "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'notifications';"`;
    
    let tableExists = false;
    try {
      const checkTableResult = execSync(checkTableCmd, { encoding: 'utf8' });
      if (checkTableResult.includes('notifications')) {
        tableExists = true;
      }
    } catch (error) {
      console.log('检查表是否存在时出现错误，继续执行检查操作...');
    }

    if (!tableExists) {
      console.log('表 notifications 不存在，跳过删除');
      return;
    }

    // 2. 检查表中是否有数据
    const checkDataCmd = `${mysqlCmd} -e "SELECT COUNT(*) as count FROM notifications;"`;
    
    try {
      const checkDataResult = execSync(checkDataCmd, { encoding: 'utf8' });
      const match = checkDataResult.match(/count\s+(\d+)/);
      const rowCount = match ? parseInt(match[1]) : 0;
      
      if (rowCount > 0) {
        console.log(`表 notifications 中有 ${rowCount} 条数据，为了保护数据，跳过删除操作`);
        return;
      }
    } catch (error) {
      console.log('检查表数据时出现错误，为了保护数据，跳过删除操作');
      return;
    }

    // 3. 删除表
    console.log('表 notifications 为空，开始删除...');
    const dropTableCmd = `${mysqlCmd} -e "DROP TABLE IF EXISTS notifications;"`;
    
    execSync(dropTableCmd, { stdio: 'inherit' });
    console.log('表 notifications 删除成功');

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  dropNotificationsTable()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = dropNotificationsTable;

