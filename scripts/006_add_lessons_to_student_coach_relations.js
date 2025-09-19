/*
 * @Author: diaochan
 * @Date: 2025-09-19 10:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-19 10:00:00
 * @Description: 为 student_coach_relations 表添加 lessons 字段，并迁移现有数据
 */

// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { execSync } = require('child_process');

/**
 * 添加 lessons 字段到 student_coach_relations 表并迁移数据
 */
async function addLessonsField() {
  try {
    console.log('开始为 student_coach_relations 表添加 lessons 字段...');

    // 获取数据库配置
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 3306;
    const dbName = process.env.DB_NAME || 'yueke';
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';

    // 构建 MySQL 命令
    const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPassword ? `-p${dbPassword}` : ''} ${dbName}`;

    // 1. 检查字段是否已存在
    const checkFieldCmd = `${mysqlCmd} -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'student_coach_relations' AND COLUMN_NAME = 'lessons';"`;
    
    try {
      const checkResult = execSync(checkFieldCmd, { encoding: 'utf8' });
      if (checkResult.includes('lessons')) {
        console.log('字段 lessons 已存在，跳过添加');
        return;
      }
    } catch (error) {
      console.log('检查字段存在性时出现错误，继续执行添加操作...');
    }

    // 2. 添加字段（JSON 字段不能直接设置复杂的默认值，先添加字段）
    const addFieldCmd = `${mysqlCmd} -e "ALTER TABLE student_coach_relations ADD COLUMN lessons JSON COMMENT '按分类的课时数，格式：[{\"category_id\":0, \"remaining_lessons\": 0}]' AFTER remaining_lessons;"`;
    
    execSync(addFieldCmd, { stdio: 'inherit' });
    console.log('字段 lessons 添加成功');

    // 3. 查询所有现有记录，获取其 remaining_lessons 值
    console.log('开始迁移现有数据...');
    
    const selectCmd = `${mysqlCmd} -e "SELECT id, remaining_lessons FROM student_coach_relations;" -s`;
    const selectResult = execSync(selectCmd, { encoding: 'utf8' });
    
    if (selectResult.trim()) {
      const rows = selectResult.trim().split('\n');
      
      for (const row of rows) {
        const [id, remainingLessons] = row.split('\t');
        
        // 为每个记录设置 lessons 字段，将现有 remaining_lessons 迁移到默认分类（category_id: 0）
        const lessonsData = JSON.stringify([
          { category_id: 0, remaining_lessons: parseInt(remainingLessons) || 0 }
        ]);
        
        // 转义 JSON 字符串中的双引号
        const escapedJson = lessonsData.replace(/"/g, '\\"');
        const updateCmd = `${mysqlCmd} -e "UPDATE student_coach_relations SET lessons = '${escapedJson}' WHERE id = ${id};"`;
        
        execSync(updateCmd, { stdio: 'inherit' });
      }
      
      console.log(`已迁移 ${rows.length} 条记录的课时数据`);
    } else {
      console.log('没有现有数据需要迁移');
    }

    // 4. 为可能的 NULL 记录设置默认值
    const defaultLessons = JSON.stringify([
      { category_id: 0, remaining_lessons: 0 }
    ]);
    
    const escapedDefaultJson = defaultLessons.replace(/"/g, '\\"');
    const updateNullCmd = `${mysqlCmd} -e "UPDATE student_coach_relations SET lessons = '${escapedDefaultJson}' WHERE lessons IS NULL;"`;
    
    execSync(updateNullCmd, { stdio: 'inherit' });
    console.log('已更新所有 NULL 记录的 lessons 字段');

    console.log('迁移脚本执行完成');
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    throw error;
  }
}

// 执行迁移
if (require.main === module) {
  addLessonsField()
    .then(() => {
      console.log('✅ 迁移脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addLessonsField;
