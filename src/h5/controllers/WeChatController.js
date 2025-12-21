const { UserSubscribeQuota } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const SubscribeMessageService = require('../../shared/services/subscribeMessageService');

/**
 * 微信相关功能控制器
 */
const WeChatController = {};

/**
 * 获取所有可用的订阅消息模板
 * @route GET /api/h5/wechat/subscribe-templates
 */
WeChatController.getSubscribeTemplates = asyncHandler(async (req, res) => {
  try {
    const descriptions = {
      BOOKING_CONFIRM: {
        title: '预约确认提醒',
        description: '你作为被预约方，收到预约确认提醒'
      },
      BOOKING_SUCCESS: {
        title: '预约成功通知',
        description: '你作为预约方，收到预约成功通知'
      },
      BOOKING_CANCEL: {
        title: '课程取消通知',
        description: '课程取消后，你会收到通知'
      },
      BOOKING_REMINDER: {
        title: '上课提醒',
        description: '上课前2小时提醒你留意课程安排'
      }
    };

    const templates = Object.keys(SubscribeMessageService.TEMPLATES).map(key => ({
      templateType: key,
      templateId: SubscribeMessageService.TEMPLATES[key],
      title: descriptions[key]?.title || key,
      description: descriptions[key]?.description || ''
    }));

    return ResponseUtil.success(res, { list: templates }, '获取模板列表成功');
  } catch (error) {
    logger.error('获取订阅模板列表失败:', error);
    return ResponseUtil.error(res, '获取模板列表失败');
  }
});

/**
 * 获取用户的订阅消息配额
 * @route GET /api/h5/wechat/subscribe-quotas
 */
WeChatController.getSubscribeQuotas = asyncHandler(async (req, res) => {
  const { userId } = req;

  try {
    const quotas = await UserSubscribeQuota.getUserQuotas(userId);

    const list = quotas.map(quota => ({
      templateType: quota.template_type,
      templateId: quota.template_id,
      remainingQuota: quota.remaining_quota,
      totalQuota: quota.total_quota,
      lastAuthorizedAt: quota.last_authorized_at,
      lastSentAt: quota.last_sent_at
    }));

    return ResponseUtil.success(res, { list }, '获取配额成功');
  } catch (error) {
    logger.error('获取用户订阅配额失败:', error);
    return ResponseUtil.error(res, '获取配额失败');
  }
});

/**
 * 上报用户授权订阅消息结果
 * @route POST /api/h5/wechat/subscribe-quotas
 */
WeChatController.reportSubscribeAuthorization = asyncHandler(async (req, res) => {
  const { userId } = req;
  const { results = [] } = req.body;

  try {
    if (!Array.isArray(results) || results.length === 0) {
      return ResponseUtil.validationError(res, '缺少授权结果');
    }

    const updatedQuotas = [];

    for (const item of results) {
      const { templateType, status } = item || {};

      if (!templateType || !status) {
        continue;
      }

      if (status === 'accept') {
        const templateId = SubscribeMessageService.TEMPLATES[templateType];

        if (!templateId) {
          logger.warn('未知的模板类型:', templateType);
          continue;
        }

        const quota = await UserSubscribeQuota.increaseQuota(
          userId,
          templateType,
          templateId,
          1
        );

        updatedQuotas.push({
          templateType: quota.template_type,
          templateId: quota.template_id,
          remainingQuota: quota.remaining_quota,
          totalQuota: quota.total_quota
        });

        logger.info('用户授权订阅消息', {
          userId,
          templateType,
          remainingQuota: quota.remaining_quota
        });
      }
    }

    return ResponseUtil.success(res, { updated: updatedQuotas }, '授权结果已记录');
  } catch (error) {
    logger.error('记录用户授权失败:', error);
    return ResponseUtil.error(res, '记录授权失败');
  }
});

module.exports = WeChatController;

