const moment = require('moment-timezone');
const { StudentCoachRelation, OperationLog, sequelize } = require('../models');
const logger = require('../utils/logger');

/**
 * 课时过期服务
 */
class LessonExpireService {
  /**
   * 批量处理过期课时
   */
  async processExpiredLessons() {
    logger.info('[定时任务] 开始检查过期课时:', moment().format('YYYY-MM-DD HH:mm:ss'));
    
    const t = await sequelize.transaction();
    let processedCount = 0;
    let clearedCount = 0;
    
    try {
      // 查询所有有效且约课状态开启的师生关系
      const relations = await StudentCoachRelation.findAll({
        where: { 
          relation_status: 1,
          booking_status: 1  // 只处理约课状态开启的关系
        },
        transaction: t
      });
      
      const now = moment.tz('Asia/Shanghai');
      const operations = [];
      
      for (const relation of relations) {
        if (!relation.lessons || relation.lessons.length === 0) continue;
        
        let needUpdate = false;
        
        for (const lesson of relation.lessons) {
          // 跳过已清零或无过期日期的
          if (lesson.is_cleared || !lesson.expire_date) continue;
          
          const expireEndTime = moment.tz(lesson.expire_date, 'Asia/Shanghai').endOf('day');
          
          // 检查是否过期
          if (now.isAfter(expireEndTime)) {
            const clearedLessons = lesson.remaining_lessons;
            
            // 清零处理（original_lessons 只在清零时设置一次）
            lesson.original_lessons = clearedLessons;
            lesson.remaining_lessons = 0;
            lesson.is_cleared = true;
            needUpdate = true;
            
            // 记录操作日志
            operations.push({
              user_id: relation.student_id,
              operation_type: 'lesson_expire',
              operation_desc: `课时过期自动清零: 分类${lesson.category_id}清零${clearedLessons}节课`,
              table_name: 'student_coach_relations',
              record_id: relation.id,
              old_data: {
                category_id: lesson.category_id,
                remaining_lessons: clearedLessons,
                expire_date: lesson.expire_date
              },
              new_data: {
                category_id: lesson.category_id,
                remaining_lessons: 0,
                expire_date: lesson.expire_date,
                is_cleared: true,
                coach_id: relation.coach_id
              },
              ip_address: null,
              user_agent: 'System-Cron'
            });
            
            clearedCount++;
          }
        }
        
        if (needUpdate) {
          relation.changed('lessons', true);
          await relation.save({ transaction: t });
          processedCount++;
        }
      }
      
      // 批量插入操作日志
      if (operations.length > 0) {
        await OperationLog.bulkCreate(operations, { transaction: t });
      }
      
      await t.commit();
      
      logger.info(`[定时任务] 完成: 处理 ${processedCount} 个关系, 清零 ${clearedCount} 个课时包`);
    } catch (error) {
      await t.rollback();
      logger.error('[定时任务] 执行失败:', error);
    }
  }
}

module.exports = new LessonExpireService();

