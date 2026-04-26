const { BlockedSlot } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
/**
 * 教练休息时段控制器
 */
class BlockedSlotController {
  /**
   * 查询休息时段列表
   * @route GET /api/h5/blocked-slots
   * @param {number} [req.query.coach_id] - 教练ID，不传时取当前登录用户
   * @param {string} req.query.date - 日期（YYYY-MM-DD），必填
   */
  static getList = asyncHandler(async (req, res) => {
    const { coach_id, date } = req.query;

    if (!date) {
      return ResponseUtil.validationError(res, 'date 参数必填，格式 YYYY-MM-DD');
    }

    // 简单格式校验
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return ResponseUtil.validationError(res, 'date 格式不正确，应为 YYYY-MM-DD');
    }

    const targetCoachId = coach_id ? Number(coach_id) : req.user.id;

    const slots = await BlockedSlot.findAll({
      where: {
        coach_id: targetCoachId,
        slot_date: date
      },
      order: [['start_time', 'ASC']]
    });

    return ResponseUtil.success(res, slots, '查询成功');
  });

  /**
   * 设置休息时段
   * @route POST /api/h5/blocked-slots
   * @param {string} req.body.slot_date - 休息日期（YYYY-MM-DD）
   * @param {string} req.body.start_time - 时间段开始（HH:mm 或 HH:mm:ss）
   * @param {string} req.body.end_time - 时间段结束（HH:mm 或 HH:mm:ss）
   */
  static create = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { slot_date, start_time, end_time } = req.body;

    if (!slot_date) {
      return ResponseUtil.validationError(res, 'slot_date 必填，格式 YYYY-MM-DD');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(slot_date)) {
      return ResponseUtil.validationError(res, 'slot_date 格式不正确，应为 YYYY-MM-DD');
    }
    if (!start_time) {
      return ResponseUtil.validationError(res, 'start_time 必填，格式 HH:mm 或 HH:mm:ss');
    }
    if (!end_time) {
      return ResponseUtil.validationError(res, 'end_time 必填，格式 HH:mm 或 HH:mm:ss');
    }
    if (start_time >= end_time) {
      return ResponseUtil.validationError(res, 'end_time 必须晚于 start_time');
    }

    const [slot, created] = await BlockedSlot.findOrCreate({
      where: {
        coach_id: coachId,
        slot_date,
        start_time,
        end_time
      },
      defaults: {
        coach_id: coachId,
        slot_date,
        start_time,
        end_time
      }
    });

    if (!created) {
      return ResponseUtil.success(res, slot, '该时段已存在');
    }

    logger.info('教练设置休息时段:', { coachId, slot_date, start_time, end_time });

    return ResponseUtil.success(res, slot, '休息时段设置成功');
  });

  /**
   * 取消休息时段
   * @route DELETE /api/h5/blocked-slots/:id
   * @description 只能删除自己的记录
   */
  static remove = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const slot = await BlockedSlot.findByPk(id);

    if (!slot) {
      return ResponseUtil.notFound(res, '休息时段不存在');
    }

    if (slot.coach_id !== coachId) {
      return ResponseUtil.forbidden(res, '无权删除他人的休息时段');
    }

    await slot.destroy();

    logger.info('教练取消休息时段:', { coachId, id });

    return ResponseUtil.success(res, null, '取消成功');
  });
}

module.exports = BlockedSlotController;
