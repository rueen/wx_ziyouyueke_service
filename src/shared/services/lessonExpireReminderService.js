const moment = require('moment-timezone');
const { StudentCoachRelation, StudentCardInstance, User } = require('../models');
const SubscribeMessageService = require('./subscribeMessageService');
const logger = require('../utils/logger');

/**
 * 课程到期提醒服务
 * 每日定时扫描3天内到期的常规课课时包和课程卡，向教练和学员各发一条订阅消息
 */
class LessonExpireReminderService {
  /**
   * 执行到期提醒扫描并发送通知
   */
  async sendExpiringReminders() {
    logger.info('[到期提醒] 开始检查即将到期的课时:', moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'));

    const today = moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
    const maxDate = moment().tz('Asia/Shanghai').add(3, 'days').format('YYYY-MM-DD');

    let sentCount = 0;

    await Promise.all([
      this._handleRelationExpiry(today, maxDate).then(n => { sentCount += n; }),
      this._handleCardExpiry(today, maxDate).then(n => { sentCount += n; })
    ]);

    logger.info(`[到期提醒] 完成，共发送 ${sentCount} 条提醒`);
  }

  /**
   * 处理常规课课时包到期提醒
   * @param {string} today - 今天日期（YYYY-MM-DD）
   * @param {string} maxDate - 最大到期日期（YYYY-MM-DD，今天+3天）
   * @returns {Promise<number>} 实际发送条数
   */
  async _handleRelationExpiry(today, maxDate) {
    let sentCount = 0;

    try {
      // 查询所有有效师生关系，课时的 expire_date 在 JS 侧过滤（JSON 字段无法直接用 SQL 区间）
      const relations = await StudentCoachRelation.findAll({
        where: { relation_status: 1 },
        include: [
          { model: User, as: 'coach', attributes: ['id', 'openid', 'nickname', 'course_categories'] },
          { model: User, as: 'student', attributes: ['id', 'openid', 'nickname'] }
        ]
      });

      for (const relation of relations) {
        if (!relation.lessons || relation.lessons.length === 0) continue;

        for (const lesson of relation.lessons) {
          if (lesson.is_cleared) continue;
          if (!lesson.expire_date) continue;
          // 过滤：到期日在 [today, maxDate] 区间内
          if (lesson.expire_date < today || lesson.expire_date > maxDate) continue;
          if (!lesson.remaining_lessons || lesson.remaining_lessons <= 0) continue;

          // 找到对应分类名称
          const categories = relation.coach?.course_categories || [];
          const category = categories.find(c => c.id === lesson.category_id);
          const courseName = category?.name || '私教课';
          const remainingLessons = lesson.remaining_lessons;
          // 计算真实剩余天数
          const daysLeft = moment.tz(lesson.expire_date, 'Asia/Shanghai').diff(moment().tz('Asia/Shanghai').startOf('day'), 'days');

          const sharedParams = {
            courseName,
            expireDate: lesson.expire_date,
            daysLeft,
            remainingLessons,
            businessType: 'lesson_expire',
            businessId: relation.id
          };

          // 通知教练 → 跳转至学员详情页
          if (relation.coach?.openid) {
            const ok = await SubscribeMessageService.sendLessonExpireNotice({
              ...sharedParams,
              receiverUser: relation.coach,
              page: SubscribeMessageService.PAGES.STUDENT_DETAIL(relation.id, relation.student_id)
            });
            if (ok) sentCount++;
          }

          // 通知学员 → 跳转至教练详情页
          if (relation.student?.openid) {
            const ok = await SubscribeMessageService.sendLessonExpireNotice({
              ...sharedParams,
              receiverUser: relation.student,
              page: SubscribeMessageService.PAGES.COACH_DETAIL(relation.id, relation.coach_id)
            });
            if (ok) sentCount++;
          }
        }
      }
    } catch (error) {
      logger.error('[到期提醒] 常规课扫描失败:', error);
    }

    return sentCount;
  }

  /**
   * 处理课程卡到期提醒
   * @param {string} today - 今天日期（YYYY-MM-DD）
   * @param {string} maxDate - 最大到期日期（YYYY-MM-DD，今天+3天）
   * @returns {Promise<number>} 实际发送条数
   */
  async _handleCardExpiry(today, maxDate) {
    let sentCount = 0;

    try {
      const { Op } = require('sequelize');

      // 查询 expire_date 在 [today, maxDate] 区间内、已开卡(card_status=1)、有剩余课时的卡片实例
      const cardInstances = await StudentCardInstance.findAll({
        where: {
          expire_date: { [Op.between]: [today, maxDate] },
          card_status: 1,
          remaining_lessons: { [Op.gt]: 0 }
        },
        include: [
          { model: User, as: 'coach', attributes: ['id', 'openid', 'nickname'] },
          { model: User, as: 'student', attributes: ['id', 'openid', 'nickname'] },
          {
            model: require('../models').CoachCard,
            as: 'coachCard',
            attributes: ['id', 'card_name']
          }
        ]
      });

      for (const card of cardInstances) {
        const courseName = card.coachCard?.card_name || '课程卡';
        const remainingLessons = card.remaining_lessons;
        const daysLeft = moment.tz(card.expire_date, 'Asia/Shanghai').diff(moment().tz('Asia/Shanghai').startOf('day'), 'days');

        const sharedParams = {
          courseName,
          expireDate: card.expire_date,
          daysLeft,
          remainingLessons,
          businessType: 'card_expire',
          businessId: card.id
        };

        // 通知教练 → 跳转至学员详情页
        if (card.coach?.openid) {
          const ok = await SubscribeMessageService.sendLessonExpireNotice({
            ...sharedParams,
            receiverUser: card.coach,
            page: SubscribeMessageService.PAGES.STUDENT_DETAIL(card.relation_id, card.student_id)
          });
          if (ok) sentCount++;
        }

        // 通知学员 → 跳转至教练详情页
        if (card.student?.openid) {
          const ok = await SubscribeMessageService.sendLessonExpireNotice({
            ...sharedParams,
            receiverUser: card.student,
            page: SubscribeMessageService.PAGES.COACH_DETAIL(card.relation_id, card.coach_id)
          });
          if (ok) sentCount++;
        }
      }
    } catch (error) {
      logger.error('[到期提醒] 课程卡扫描失败:', error);
    }

    return sentCount;
  }
}

module.exports = new LessonExpireReminderService();
