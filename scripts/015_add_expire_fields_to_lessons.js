/*
 * @Description: 为现有课时数据添加过期相关字段
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { StudentCoachRelation } = require('../src/shared/models');

/**
 * 为现有课时数据添加过期相关字段
 */
async function migrate() {
  try {
    console.log('开始迁移：为课时数据添加过期字段...');
    
    // 只查询已存在的字段，避免查询新添加的字段（如 booking_status 等）
    const relations = await StudentCoachRelation.findAll({
      attributes: ['id', 'student_id', 'coach_id', 'student_name', 'lessons', 
                   'coach_remark', 'student_remark', 'relation_status', 
                   'bind_time', 'last_course_time', 'createdAt', 'updatedAt']
    });
    
    let updatedCount = 0;
    
    for (const relation of relations) {
      if (!relation.lessons || relation.lessons.length === 0) continue;
      
      let needUpdate = false;
      
      for (const lesson of relation.lessons) {
        // 添加新字段（如果不存在）
        if (lesson.expire_date === undefined) {
          lesson.expire_date = null; // 永久有效
          lesson.is_cleared = false;
          lesson.original_lessons = null; // 只在清零时记录
          needUpdate = true;
        }
      }
      
      if (needUpdate) {
        relation.changed('lessons', true);
        await relation.save();
        updatedCount++;
        console.log(`✓ 已更新关系 ID: ${relation.id}`);
      }
    }
    
    console.log(`\n迁移完成！共更新 ${updatedCount} 条记录`);
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();

