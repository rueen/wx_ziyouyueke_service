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
          // 跳过无过期日期的
          if (!lesson.expire_date) continue;

          const expireEndTime = moment.tz(lesson.expire_date, 'Asia/Shanghai').endOf('day');

          // 过期后仅记录日志用于统计，不修改剩余课时（阻断预约由 getCategoryLessons 在调用时判断）
          if (now.isAfter(expireEndTime) && !lesson.is_cleared) {
            operations.push({
              user_id: relation.student_id,
              operation_type: 'lesson_expire',
              operation_desc: `课时已过期（未清零）: 分类${lesson.category_id}剩余${lesson.remaining_lessons}节课`,
              table_name: 'student_coach_relations',
              record_id: relation.id,
              old_data: {
                category_id: lesson.category_id,
                remaining_lessons: lesson.remaining_lessons,
                expire_date: lesson.expire_date
              },
              new_data: {
                category_id: lesson.category_id,
                remaining_lessons: lesson.remaining_lessons,
                expire_date: lesson.expire_date,
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
      
      logger.info(`[定时任务] 完成: 处理 ${processedCount} 个关系, 过期 ${clearedCount} 个课时包（仅记录，不清零）`);
    } catch (error) {
      await t.rollback();
      logger.error('[定时任务] 执行失败:', error);
    }
  }
}

module.exports = new LessonExpireService();

