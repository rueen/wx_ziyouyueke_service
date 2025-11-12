const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { CourseBooking, User, Address } = require('../models');
const SubscribeMessageService = require('./subscribeMessageService');
const logger = require('../utils/logger');

/**
 * 课程上课提醒服务
 * 每次执行会扫描未来两小时内即将上课的课程，发送提醒给学员和教练
 */
class BookingReminderService {
  /**
   * 执行提醒任务
   * @returns {Promise<void>}
   */
  static async sendUpcomingReminders() {
    const now = moment.tz('Asia/Shanghai');
    const windowEnd = now.clone().add(2, 'hours');

    const startDate = now.format('YYYY-MM-DD');
    const endDate = windowEnd.format('YYYY-MM-DD');

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
        return;
      }

      for (const booking of bookings) {
        try {
          const startDateTime = moment.tz(
            `${booking.course_date} ${booking.start_time}`,
            'YYYY-MM-DD HH:mm:ss',
            'Asia/Shanghai'
          );

          // 仅处理未来两小时内且尚未开始的课程
          const diffMinutes = startDateTime.diff(now, 'minutes');
          if (diffMinutes < 0 || diffMinutes > 120) {
            continue;
          }

          if (!booking.address) {
            logger.warn('课程缺少地址信息，跳过提醒', { bookingId: booking.id });
            continue;
          }

          // 通知学员
          if (booking.student) {
            await SubscribeMessageService.sendBookingReminderNotice({
              booking,
              receiverUser: booking.student,
              address: booking.address
            });
          }

          // 通知教练
          if (booking.coach) {
            await SubscribeMessageService.sendBookingReminderNotice({
              booking,
              receiverUser: booking.coach,
              address: booking.address
            });
          }
        } catch (error) {
          logger.error('上课提醒处理单条课程失败:', {
            bookingId: booking.id,
            error: error.message
          });
        }
      }
    } catch (error) {
      logger.error('执行课程上课提醒任务失败:', error);
    }
  }
}

module.exports = BookingReminderService;

