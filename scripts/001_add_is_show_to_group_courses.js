/*
 * @Author: diaochan
 * @Date: 2025-11-04 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-11-04 00:00:00
 * @Description: 为 group_courses 表添加 is_show 字段，并设置老数据默认值为0
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 is_show 字段到 group_courses 表
 */
async function addIsShowField() {
  try {
    console.log('开始为 group_courses 表添加 is_show 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    let fieldExists = false;
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'group_courses' AND COLUMN_NAME = 'is_show';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('is_show')) {
        fieldExists = true;
        console.log('字段 is_show 已存在，跳过添加');
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 如果字段不存在，添加字段
    if (!fieldExists) {
      try {
        const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE group_courses ADD COLUMN is_show TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在活动大厅展示：0-否，1-是' AFTER enrollment_scope;"`;
        execSync(addFieldCmd, { stdio: 'inherit' });
        console.log('字段 is_show 添加成功');
      } catch (addError) {
        console.error('添加字段失败:', addError.message);
        throw addError;
      }

      // 3. 更新现有数据（老数据的 is_show 设置为 0）
      // 只在首次添加字段时执行，确保老数据被设置为 0
      try {
        const updateCmd = `${mysqlCmd} -e "UPDATE group_courses SET is_show = 0;"`;
        execSync(updateCmd, { stdio: 'inherit' });
        console.log('已更新现有记录的 is_show 字段为 0');
      } catch (updateError) {
        console.error('更新现有数据失败:', updateError.message);
        // 更新失败不影响整体流程，继续执行
      }
    } else {
      console.log('字段已存在，跳过数据更新步骤');
    }

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

