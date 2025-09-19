/*
 * @Author: diaochan
 * @Date: 2025-09-19 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-19 10:00:00
 * @Description: 为 course_bookings 表添加 category_id 字段，并设置默认值
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 category_id 字段到 course_bookings 表
 */
async function addCategoryIdField() {
  try {
    console.log('开始为 course_bookings 表添加 category_id 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'course_bookings' AND COLUMN_NAME = 'category_id';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('category_id')) {
        console.log('字段 category_id 已存在，跳过添加');
        return;
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 添加字段，设置默认值为 0
    const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE course_bookings ADD COLUMN category_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '课程分类ID' AFTER address_id;"`;
    
    execSync(addFieldCmd, { stdio: 'inherit' });
    console.log('字段 category_id 添加成功');

    // 3. 更新现有数据，为所有记录设置默认分类ID（0）
    const updateCmd = `${mysqlCmd} -e "UPDATE course_bookings SET category_id = 0 WHERE category_id IS NULL;"`;
    
    execSync(updateCmd, { stdio: 'inherit' });
    console.log('已更新现有记录的 category_id 字段为默认值 0');

    // 4. 添加索引
    const addIndexCmd = `${mysqlCmd} -e "ALTER TABLE course_bookings ADD INDEX idx_category_id (category_id);"`;
    
    try {
      execSync(addIndexCmd, { stdio: 'inherit' });
      console.log('已添加 category_id 字段的索引');
    } catch (error) {
      if (error.message.includes('Duplicate key name')) {
        console.log('索引 idx_category_id 已存在，跳过添加');
      } else {
        console.warn('添加索引时出现警告:', error.message);
      }
    }

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addCategoryIdField()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addCategoryIdField;
