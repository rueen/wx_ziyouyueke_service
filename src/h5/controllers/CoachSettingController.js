const { CoachSetting } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/** 默认配置（无记录时返回） */
const DEFAULT_SETTING = {
  completion_method: 'scan',
  group_checkin_method: 'scan'
};

/** 允许的课程完成方式 */
const VALID_COMPLETION_METHODS = ['scan', 'manual'];

/** 允许的团课签到方式 */
const VALID_CHECKIN_METHODS = ['scan', 'button'];

/**
 * 教练设置控制器
 */
class CoachSettingController {
  /**
   * 获取当前登录教练的设置
   * @route GET /api/h5/coach-settings
   * @description 无记录时返回默认值
   */
  static getSetting = asyncHandler(async (req, res) => {
    const coachId = req.user.id;

    const setting = await CoachSetting.findOne({
      where: { coach_id: coachId }
    });

    if (!setting) {
      return ResponseUtil.success(res, {
        coach_id: coachId,
        ...DEFAULT_SETTING
      }, '获取配置成功');
    }

    return ResponseUtil.success(res, setting, '获取配置成功');
  });

  /**
   * 创建或更新教练设置（upsert）
   * @route PUT /api/h5/coach-settings
   * @param {string} req.body.completion_method - 课程完成方式
   */
  static upsertSetting = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { completion_method, group_checkin_method } = req.body;

    if (completion_method !== undefined && !VALID_COMPLETION_METHODS.includes(completion_method)) {
      return ResponseUtil.validationError(
        res,
        `completion_method 必须为以下值之一：${VALID_COMPLETION_METHODS.join('、')}`
      );
    }

    if (group_checkin_method !== undefined && !VALID_CHECKIN_METHODS.includes(group_checkin_method)) {
      return ResponseUtil.validationError(
        res,
        `group_checkin_method 必须为以下值之一：${VALID_CHECKIN_METHODS.join('、')}`
      );
    }

    if (completion_method === undefined && group_checkin_method === undefined) {
      return ResponseUtil.validationError(res, '至少需要传入一个配置字段');
    }

    const updateData = {};
    if (completion_method !== undefined) updateData.completion_method = completion_method;
    if (group_checkin_method !== undefined) updateData.group_checkin_method = group_checkin_method;

    const [setting, created] = await CoachSetting.findOrCreate({
      where: { coach_id: coachId },
      defaults: {
        coach_id: coachId,
        ...DEFAULT_SETTING,
        ...updateData
      }
    });

    if (!created) {
      await setting.update(updateData);
    }

    logger.info('教练设置更新:', { coachId, ...updateData, created });

    return ResponseUtil.success(res, setting, created ? '配置创建成功' : '配置更新成功');
  });
}

module.exports = CoachSettingController;
