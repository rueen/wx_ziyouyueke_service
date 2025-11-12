/*
 * @Author: diaochan
 * @Date: 2025-11-09 10:31:05
 * @LastEditors: diaochan
 * @LastEditTime: 2025-11-12 18:36:42
 * @Description: 
 */
const wechatUtil = require('../utils/wechat');
const logger = require('../utils/logger');
const moment = require('moment-timezone');
const { SubscribeMessageLog, UserSubscribeQuota } = require('../models');

/**
 * 微信订阅消息服务
 * 负责发送各种业务场景的订阅消息
 * 支持防重机制，避免同一消息多次发送
 */
class SubscribeMessageService {
  /**
   * 订阅消息模板ID配置
   */
  static TEMPLATES = {
    // 预约确认提醒
    BOOKING_CONFIRM: '5UyBW3TXEbdAlvdb_eV_5H6qePB0aEFlVc9ow67ZOXE',
    // 预约成功通知
    BOOKING_SUCCESS: 'TFL2352DnixMHPBHiOg955ByXWBZWXTvk7g05ywsAnw',
    // 课程取消通知
    BOOKING_CANCEL: '7ziRVg9Gnp4huLb3q4v48ylR2z-kCOkEoM5-8Ad-Hkg',
    // 上课提醒
    BOOKING_REMINDER: '92wWk3WlAV8raKdjYB9Ffb_x7G4LDfHrrcE0xoLvvO4'
  };

  /**
   * 小程序页面路径配置
   */
  static PAGES = {
    // 课程详情页
    COURSE_DETAIL: (courseId) => `pages/courseDetail/courseDetail?id=${courseId}`
  };

  /**
   * 格式化时间段
   * @param {string} courseDate - 课程日期 YYYY-MM-DD
   * @param {string} startTime - 开始时间 HH:mm:ss
   * @param {string} endTime - 结束时间 HH:mm:ss
   * @returns {string} 格式化后的时间段，例如：2025-11-10 19:00 - 20:00
   */
  static formatTimeSlot(courseDate, startTime, endTime) {
    try {
      const [year, month, day] = courseDate.split('-');
      const start = startTime.substring(0, 5); // HH:mm
      const end = endTime.substring(0, 5); // HH:mm
      return `${year}年${month}月${day}日 ${start}~${end}`;
    } catch (error) {
      logger.error('格式化时间段失败:', error);
      return `${courseDate} ${startTime}~${endTime}`;
    }
  }

  /**
   * 场景一：预约确认提醒
   * 业务场景1：学员预约课程 → 通知教练
   * 业务场景2：教练预约课程 → 通知学员
   * 
   * @param {Object} params - 参数对象
   * @param {Object} params.booking - 课程预约对象
   * @param {Object} params.bookerUser - 预约人用户对象
   * @param {Object} params.receiverUser - 接收人用户对象
   * @param {Object} params.relation - 师生关系对象
   * @param {Object} params.address - 地址对象
   * @returns {Promise<boolean>} 发送是否成功
   */
  static async sendBookingConfirmNotice(params) {
    let messageLog = null;
    
    try {
      const { booking, bookerUser, receiverUser, relation, address } = params;

      // 验证必要参数
      if (!booking || !bookerUser || !receiverUser || !address) {
        logger.warn('发送预约确认提醒失败：缺少必要参数');
        return false;
      }

      // 验证接收人的 openid
      if (!receiverUser.openid) {
        logger.warn('发送预约确认提醒失败：接收人没有 openid', { userId: receiverUser.id });
        return false;
      }

      // 检查是否已发送（防重）
      const alreadySent = await SubscribeMessageLog.isMessageSent(
        'course_booking',
        booking.id,
        'BOOKING_CONFIRM',
        receiverUser.id
      );

      if (alreadySent) {
        logger.info('预约确认提醒已发送过，跳过重复发送', {
          bookingId: booking.id,
          receiverId: receiverUser.id
        });
        return true; // 返回 true 因为消息已经发送过了
      }

      // 确定预约人姓名
      let bookerName;
      if (booking.created_by === booking.student_id) {
        // 学员预约 → 通知教练
        bookerName = relation?.student_name || bookerUser.nickname || '学员';
      } else {
        // 教练预约 → 通知学员
        bookerName = bookerUser.nickname || '教练';
      }

      // 格式化时间段
      const timeSlot = this.formatTimeSlot(
        booking.course_date, 
        booking.start_time, 
        booking.end_time
      );

      // 构建消息数据
      const messageData = {
        thing7: {
          value: bookerName.substring(0, 20) // 限制20个字符
        },
        time8: {
          value: timeSlot
        },
        thing9: {
          value: address.name.substring(0, 20) // 限制20个字符
        },
        thing13: {
          value: '待确认'
        }
      };

      // 跳转页面
      const page = this.PAGES.COURSE_DETAIL(booking.id);

      // 先创建发送记录（状态为发送中）
      const messageLog = await SubscribeMessageLog.recordMessage({
        templateId: this.TEMPLATES.BOOKING_CONFIRM,
        templateType: 'BOOKING_CONFIRM',
        businessType: 'course_booking',
        businessId: booking.id,
        receiverUserId: receiverUser.id,
        receiverOpenid: receiverUser.openid,
        messageData: messageData,
        pagePath: page,
        sendStatus: 0 // 发送中
      });

      // 发送消息
      const sendResult = await wechatUtil.sendTemplateMessage(
        receiverUser.openid,
        this.TEMPLATES.BOOKING_CONFIRM,
        messageData,
        page
      );

      // 更新发送状态
      if (sendResult.success) {
        await messageLog.updateSendStatus(1); // 成功
        
        // 发送成功，扣减用户配额
        await UserSubscribeQuota.decreaseQuota(receiverUser.id, 'BOOKING_CONFIRM', 1);
        
        logger.info('发送预约确认提醒成功', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          bookerName,
          logId: messageLog.id
        });
      } else {
        await messageLog.updateSendStatus(
          2,
          sendResult.errcode ?? 'SEND_FAILED',
          sendResult.errmsg ?? '消息发送失败'
        );
        
        // 如果是用户未授权或次数用尽（43101），重置本地配额为0
        if (sendResult.errcode === '43101' || sendResult.errcode === 43101) {
          await UserSubscribeQuota.resetQuota(receiverUser.id, 'BOOKING_CONFIRM');
          logger.info('检测到用户订阅次数用尽，已重置本地配额', {
            userId: receiverUser.id,
            templateType: 'BOOKING_CONFIRM'
          });
        }
        
        logger.warn('发送预约确认提醒失败', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          errcode: sendResult.errcode,
          errmsg: sendResult.errmsg
        });
      }

      return sendResult.success;
    } catch (error) {
      logger.error('发送预约确认提醒异常:', error);
      
      // 更新发送状态为失败
      if (messageLog) {
        try {
          await messageLog.updateSendStatus(2, 'EXCEPTION', error.message);
        } catch (updateError) {
          logger.error('更新消息发送状态失败:', updateError);
        }
      }
      
      return false;
    }
  }

  /**
   * 场景二：预约成功通知
   * 业务场景1：教练已确认课程 → 通知发起课程预约的学员
   * 业务场景2：学员已确认课程 → 通知发起课程预约的教练
   * 
   * @param {Object} params - 参数对象
   * @param {Object} params.booking - 课程预约对象
   * @param {Object} params.coach - 教练用户对象
   * @param {Object} params.student - 学员用户对象
   * @param {Object} params.confirmerUser - 确认人用户对象
   * @param {Object} params.receiverUser - 接收人用户对象
   * @param {Object} params.address - 地址对象
   * @param {string} params.categoryName - 课程分类名称
   * @returns {Promise<boolean>} 发送是否成功
   */
  static async sendBookingSuccessNotice(params) {
    let messageLog = null;
    
    try {
      const { booking, coach, student, confirmerUser, receiverUser, address, categoryName } = params;

      // 验证必要参数
      if (!booking || !coach || !student || !confirmerUser || !receiverUser || !address || !categoryName) {
        logger.warn('发送预约成功通知失败：缺少必要参数');
        return false;
      }

      // 验证接收人的 openid
      if (!receiverUser.openid) {
        logger.warn('发送预约成功通知失败：接收人没有 openid', { userId: receiverUser.id });
        return false;
      }

      // 检查是否已发送（防重）
      const alreadySent = await SubscribeMessageLog.isMessageSent(
        'course_booking',
        booking.id,
        'BOOKING_SUCCESS',
        receiverUser.id
      );

      if (alreadySent) {
        logger.info('预约成功通知已发送过，跳过重复发送', {
          bookingId: booking.id,
          receiverId: receiverUser.id
        });
        return true; // 返回 true 因为消息已经发送过了
      }

      // 格式化时间段
      const timeSlot = this.formatTimeSlot(
        booking.course_date, 
        booking.start_time, 
        booking.end_time
      );

      // 确定备注内容
      let remark = '';
      if (confirmerUser.id === coach.id) {
        // 教练确认 → 通知学员，使用学员备注
        remark = booking.student_remark || '无';
      } else {
        // 学员确认 → 通知教练，使用教练备注
        remark = booking.coach_remark || '无';
      }

      // 构建消息数据
      const messageData = {
        thing41: {
          value: categoryName.substring(0, 20) // 限制20个字符
        },
        time43: {
          value: timeSlot
        },
        thing44: {
          value: address.name.substring(0, 20) // 限制20个字符
        },
        thing4: {
          value: remark.substring(0, 20) // 限制20个字符
        }
      };

      // 跳转页面
      const page = this.PAGES.COURSE_DETAIL(booking.id);

      // 先创建发送记录（状态为发送中）
      messageLog = await SubscribeMessageLog.recordMessage({
        templateId: this.TEMPLATES.BOOKING_SUCCESS,
        templateType: 'BOOKING_SUCCESS',
        businessType: 'course_booking',
        businessId: booking.id,
        receiverUserId: receiverUser.id,
        receiverOpenid: receiverUser.openid,
        messageData: messageData,
        pagePath: page,
        sendStatus: 0 // 发送中
      });

      // 发送消息
      const sendResult = await wechatUtil.sendTemplateMessage(
        receiverUser.openid,
        this.TEMPLATES.BOOKING_SUCCESS,
        messageData,
        page
      );

      // 更新发送状态
      if (sendResult.success) {
        await messageLog.updateSendStatus(1); // 成功
        
        // 发送成功，扣减用户配额
        await UserSubscribeQuota.decreaseQuota(receiverUser.id, 'BOOKING_SUCCESS', 1);
        
        logger.info('发送预约成功通知成功', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          confirmerId: confirmerUser.id,
          logId: messageLog.id
        });
      } else {
        await messageLog.updateSendStatus(
          2,
          sendResult.errcode ?? 'SEND_FAILED',
          sendResult.errmsg ?? '消息发送失败'
        ); // 失败
        
        // 如果是用户未授权或次数用尽（43101），重置本地配额为0
        if (sendResult.errcode === '43101' || sendResult.errcode === 43101) {
          await UserSubscribeQuota.resetQuota(receiverUser.id, 'BOOKING_SUCCESS');
          logger.info('检测到用户订阅次数用尽，已重置本地配额', {
            userId: receiverUser.id,
            templateType: 'BOOKING_SUCCESS'
          });
        }
        
        logger.warn('发送预约成功通知失败', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          errcode: sendResult.errcode,
          errmsg: sendResult.errmsg
        });
      }

      return sendResult.success;
    } catch (error) {
      logger.error('发送预约成功通知异常:', error);
      
      // 更新发送状态为失败
      if (messageLog) {
        try {
          await messageLog.updateSendStatus(2, 'EXCEPTION', error.message);
        } catch (updateError) {
          logger.error('更新消息发送状态失败:', updateError);
        }
      }
      
      return false;
    }
  }

  /**
   * 场景三：课程取消通知
   * 业务场景：课程被取消后通知另一方
   *
   * @param {Object} params - 参数对象
   * @param {Object} params.booking - 课程预约对象
   * @param {Object} params.receiverUser - 接收人用户对象
   * @param {Object} params.address - 地址对象
   * @param {string} params.cancelReason - 取消原因
   * @returns {Promise<boolean>} 发送是否成功
   */
  static async sendBookingCancelNotice(params) {
    let messageLog = null;

    try {
      const { booking, receiverUser, address, cancelReason } = params;

      // 验证必要参数
      if (!booking || !receiverUser || !address) {
        logger.warn('发送课程取消通知失败：缺少必要参数');
        return false;
      }

      // 验证接收人的 openid
      if (!receiverUser.openid) {
        logger.warn('发送课程取消通知失败：接收人没有 openid', { userId: receiverUser.id });
        return false;
      }

      // 检查是否已发送（防重）
      const alreadySent = await SubscribeMessageLog.isMessageSent(
        'course_booking',
        booking.id,
        'BOOKING_CANCEL',
        receiverUser.id
      );

      if (alreadySent) {
        logger.info('课程取消通知已发送过，跳过重复发送', {
          bookingId: booking.id,
          receiverId: receiverUser.id
        });
        return true;
      }

      // 格式化时间段
      const timeSlot = this.formatTimeSlot(
        booking.course_date,
        booking.start_time,
        booking.end_time
      );

      const reason = (cancelReason || booking.cancel_reason || '对方取消了课程').substring(0, 20);

      const messageData = {
        time18: {
          value: timeSlot
        },
        thing14: {
          value: address.name.substring(0, 20)
        },
        thing4: {
          value: reason
        }
      };

      const page = this.PAGES.COURSE_DETAIL(booking.id);

      // 先创建发送记录
      messageLog = await SubscribeMessageLog.recordMessage({
        templateId: this.TEMPLATES.BOOKING_CANCEL,
        templateType: 'BOOKING_CANCEL',
        businessType: 'course_booking',
        businessId: booking.id,
        receiverUserId: receiverUser.id,
        receiverOpenid: receiverUser.openid,
        messageData: messageData,
        pagePath: page,
        sendStatus: 0
      });

      // 发送消息
      const sendResult = await wechatUtil.sendTemplateMessage(
        receiverUser.openid,
        this.TEMPLATES.BOOKING_CANCEL,
        messageData,
        page
      );

      if (sendResult.success) {
        await messageLog.updateSendStatus(1);
        await UserSubscribeQuota.decreaseQuota(receiverUser.id, 'BOOKING_CANCEL', 1);

        logger.info('发送课程取消通知成功', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          logId: messageLog.id
        });
      } else {
        await messageLog.updateSendStatus(
          2,
          sendResult.errcode ?? 'SEND_FAILED',
          sendResult.errmsg ?? '消息发送失败'
        );

        if (sendResult.errcode === '43101' || sendResult.errcode === 43101) {
          await UserSubscribeQuota.resetQuota(receiverUser.id, 'BOOKING_CANCEL');
          logger.info('检测到用户订阅次数用尽，已重置本地配额', {
            userId: receiverUser.id,
            templateType: 'BOOKING_CANCEL'
          });
        }

        logger.warn('发送课程取消通知失败', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          errcode: sendResult.errcode,
          errmsg: sendResult.errmsg
        });
      }

      return sendResult.success;
    } catch (error) {
      logger.error('发送课程取消通知异常:', error);

      if (messageLog) {
        try {
          await messageLog.updateSendStatus(2, 'EXCEPTION', error.message);
        } catch (updateError) {
          logger.error('更新消息发送状态失败:', updateError);
        }
      }

      return false;
    }
  }

  /**
   * 场景四：上课提醒
   * 业务场景：上课前发送提醒通知
   *
   * @param {Object} params - 参数对象
   * @param {Object} params.booking - 课程预约对象
   * @param {Object} params.receiverUser - 接收人用户对象
   * @param {Object} params.address - 地址对象
   * @returns {Promise<boolean>} 发送是否成功
   */
  static async sendBookingReminderNotice(params) {
    let messageLog = null;

    try {
      const { booking, receiverUser, address } = params;

      if (!booking || !receiverUser || !address) {
        logger.warn('发送上课提醒失败：缺少必要参数');
        return false;
      }

      if (!receiverUser.openid) {
        logger.warn('发送上课提醒失败：接收人没有 openid', { userId: receiverUser.id });
        return false;
      }

      const alreadySent = await SubscribeMessageLog.isMessageSent(
        'course_booking',
        booking.id,
        'BOOKING_REMINDER',
        receiverUser.id
      );

      if (alreadySent) {
        logger.info('上课提醒已发送过，跳过重复发送', {
          bookingId: booking.id,
          receiverId: receiverUser.id
        });
        return true;
      }

      const timeSlot = this.formatTimeSlot(
        booking.course_date,
        booking.start_time,
        booking.end_time
      );

      const messageData = {
        time10: {
          value: timeSlot
        },
        thing4: {
          value: address.name.substring(0, 20)
        }
      };

      const page = this.PAGES.COURSE_DETAIL(booking.id);

      messageLog = await SubscribeMessageLog.findOne({
        where: {
          template_type: 'BOOKING_REMINDER',
          business_type: 'course_booking',
          business_id: booking.id,
          receiver_user_id: receiverUser.id
        }
      });

      if (messageLog) {
        // 如果找到已有记录且已经发送成功，直接返回
        if (messageLog.send_status === 1) {
          logger.info('上课提醒已发送成功（并发检测），跳过重复发送', {
            bookingId: booking.id,
            receiverId: receiverUser.id,
            logId: messageLog.id
          });
          return true;
        }
        
        // 只更新失败或发送中的记录
        await messageLog.update({
          template_id: this.TEMPLATES.BOOKING_REMINDER,
          message_data: messageData,
          page_path: page,
          send_status: 0,
          error_code: null,
          error_message: null,
          send_time: new Date()
        });
      } else {
        messageLog = await SubscribeMessageLog.recordMessage({
          templateId: this.TEMPLATES.BOOKING_REMINDER,
          templateType: 'BOOKING_REMINDER',
          businessType: 'course_booking',
          businessId: booking.id,
          receiverUserId: receiverUser.id,
          receiverOpenid: receiverUser.openid,
          messageData: messageData,
          pagePath: page,
          sendStatus: 0
        });
      }

      const sendResult = await wechatUtil.sendTemplateMessage(
        receiverUser.openid,
        this.TEMPLATES.BOOKING_REMINDER,
        messageData,
        page
      );

      if (sendResult.success) {
        await messageLog.updateSendStatus(1);
        await UserSubscribeQuota.decreaseQuota(receiverUser.id, 'BOOKING_REMINDER', 1);

        logger.info('发送上课提醒成功', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          logId: messageLog.id
        });
      } else {
        await messageLog.updateSendStatus(
          2,
          sendResult.errcode ?? 'SEND_FAILED',
          sendResult.errmsg ?? '消息发送失败'
        );

        if (sendResult.errcode === '43101' || sendResult.errcode === 43101) {
          await UserSubscribeQuota.resetQuota(receiverUser.id, 'BOOKING_REMINDER');
          logger.info('检测到用户订阅次数用尽，已重置本地配额', {
            userId: receiverUser.id,
            templateType: 'BOOKING_REMINDER'
          });
        }

        logger.warn('发送上课提醒失败', {
          bookingId: booking.id,
          receiverId: receiverUser.id,
          errcode: sendResult.errcode,
          errmsg: sendResult.errmsg
        });
      }

      return sendResult.success;
    } catch (error) {
      logger.error('发送上课提醒异常:', error);

      if (messageLog) {
        try {
          await messageLog.updateSendStatus(2, 'EXCEPTION', error.message);
        } catch (updateError) {
          logger.error('更新消息发送状态失败:', updateError);
        }
      }

      return false;
    }
  }

  /**
   * 批量发送订阅消息
   * @param {string} templateType - 模板类型
   * @param {Array<Object>} paramsList - 参数列表
   * @returns {Promise<Object>} 发送结果统计
   */
  static async sendBatchMessages(templateType, paramsList) {
    const results = {
      total: paramsList.length,
      success: 0,
      failed: 0
    };

    for (const params of paramsList) {
      let result = false;
      
      switch (templateType) {
        case 'BOOKING_CONFIRM':
          result = await this.sendBookingConfirmNotice(params);
          break;
        case 'BOOKING_SUCCESS':
          result = await this.sendBookingSuccessNotice(params);
          break;
        case 'BOOKING_CANCEL':
          result = await this.sendBookingCancelNotice(params);
          break;
        case 'BOOKING_REMINDER':
          result = await this.sendBookingReminderNotice(params);
          break;
        default:
          logger.warn('未知的模板类型:', templateType);
          break;
      }

      if (result) {
        results.success++;
      } else {
        results.failed++;
      }

      // 避免频率限制，每次发送后延迟100ms
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('批量发送订阅消息完成', results);
    return results;
  }
}

module.exports = SubscribeMessageService;

