const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { CourseBooking, User, Address } = require('../models');
const SubscribeMessageService = require('./subscribeMessageService');
const logger = require('../utils/logger');

/**
 * 课程24小时提前提醒服务
 * 每次执行会扫描未来24小时内即将上课的课程，发送提醒给学员和教练
 */
class BookingReminder24HService {
  /**
   * 执行24小时提醒任务
   * @returns {Promise<void>}
   */
  static async sendUpcomingReminders() {
    const now = moment.tz('Asia/Shanghai');
    // 扫描23-25小时之间的课程（给1小时的缓冲时间）
    const windowStart = now.clone().add(23, 'hours');
    const windowEnd = now.clone().add(25, 'hours');

    const startDate = windowStart.format('YYYY-MM-DD');
    const endDate = windowEnd.format('YYYY-MM-DD');

    logger.info('开始执行24小时课程提醒任务', {
      now: now.format('YYYY-MM-DD HH:mm:ss'),
      windowStart: windowStart.format('YYYY-MM-DD HH:mm:ss'),
      windowEnd: windowEnd.format('YYYY-MM-DD HH:mm:ss'),
      scanDateRange: `${startDate} ~ ${endDate}`
    });

    try {
      const bookings = await CourseBooking.findAll({
        where: {
          booking_status: { [Op.in]: [1, 2] }, // 待确认、已确认
          course_date: { [Op.between]: [startDate, endDate] }
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'openid']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'openid']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name']
          }
        ]
      });

      if (bookings.length === 0) {
        logger.info('没有需要发送24小时提醒的课程');
        return;
      }

      logger.info(`找到 ${bookings.length} 个需要发送24小时提醒的课程`);

      let successCount = 0;
      let failedCount = 0;

      for (const booking of bookings) {
        try {
          const startDateTime = moment.tz(
            `${booking.course_date} ${booking.start_time}`,
            'YYYY-MM-DD HH:mm:ss',
            'Asia/Shanghai'
          );

          // 计算距离课程开始的时间（小时）
          const diffHours = startDateTime.diff(now, 'hours', true);
          
          // 只处理23-25小时之间的课程
          if (diffHours < 23 || diffHours > 25) {
            logger.debug('课程不在24小时提醒窗口内，跳过', {
              bookingId: booking.id,
              diffHours: diffHours.toFixed(2)
            });
            continue;
          }

          if (!booking.address) {
            logger.warn('课程缺少地址信息，跳过提醒', { bookingId: booking.id });
            failedCount++;
            continue;
          }

          let studentSent = false;
          let coachSent = false;

          // 通知学员
          if (booking.student) {
            studentSent = await SubscribeMessageService.sendBookingReminder24HNotice({
              booking,
              receiverUser: booking.student,
              address: booking.address
            });
          }

          // 通知教练
          if (booking.coach) {
            coachSent = await SubscribeMessageService.sendBookingReminder24HNotice({
              booking,
              receiverUser: booking.coach,
              address: booking.address
            });
          }

          if (studentSent || coachSent) {
            successCount++;
            logger.info('24小时提醒发送成功', {
              bookingId: booking.id,
              studentSent,
              coachSent,
              diffHours: diffHours.toFixed(2)
            });
          } else {
            failedCount++;
          }

          // 避免频率限制，每次发送后延迟100ms
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failedCount++;
          logger.error('24小时提醒处理单条课程失败:', {
            bookingId: booking.id,
            error: error.message
          });
        }
      }

      logger.info('24小时课程提醒任务执行完成', {
        total: bookings.length,
        success: successCount,
        failed: failedCount
      });
    } catch (error) {
      logger.error('执行24小时课程提醒任务失败:', error);
    }
  }
}

module.exports = BookingReminder24HService;

