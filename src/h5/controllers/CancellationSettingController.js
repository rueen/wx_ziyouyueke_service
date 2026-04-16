const { CancellationSetting } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/** 默认配置（无记录时返回） */
const DEFAULT_SETTING = {
  is_enabled: 0,
  time_window: 'month',
  max_count: 3
};

/**
 * 取消次数限制配置控制器
 */
class CancellationSettingController {
  /**
   * 获取教练的取消次数限制配置
   * @route GET /api/h5/cancellation-settings
   * @description 无数据时返回默认值
   */
  static getSetting = asyncHandler(async (req, res) => {
    const coachId = req.user.id;

    let setting = await CancellationSetting.findOne({
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
   * 创建或更新教练的取消次数限制配置（upsert）
   * @route PUT /api/h5/cancellation-settings
   */
  static upsertSetting = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { is_enabled, time_window, max_count } = req.body;

    // 参数校验
    if (is_enabled === undefined || ![0, 1].includes(Number(is_enabled))) {
      return ResponseUtil.validationError(res, 'is_enabled 必须为 0 或 1');
    }

    const validWindows = ['day', 'week', 'month', 'quarter', 'year'];
    if (!time_window || !validWindows.includes(time_window)) {
      return ResponseUtil.validationError(res, `time_window 必须为以下值之一：${validWindows.join('、')}`);
    }

    if (max_count === undefined || !Number.isInteger(Number(max_count)) || Number(max_count) < 1) {
      return ResponseUtil.validationError(res, 'max_count 必须为正整数');
    }

    const [setting, created] = await CancellationSetting.findOrCreate({
      where: { coach_id: coachId },
      defaults: {
        coach_id: coachId,
        is_enabled: Number(is_enabled),
        time_window,
        max_count: Number(max_count)
      }
    });

    if (!created) {
      await setting.update({
        is_enabled: Number(is_enabled),
        time_window,
        max_count: Number(max_count)
      });
    }

    logger.info('取消次数限制配置更新:', {
      coachId,
      is_enabled,
      time_window,
      max_count,
      created
    });

    return ResponseUtil.success(res, setting, created ? '配置创建成功' : '配置更新成功');
  });
}

module.exports = CancellationSettingController;
