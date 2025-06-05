const { TimeTemplate } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 时间模板控制器
 */
class TimeTemplateController {
  /**
   * 获取教练时间模板列表
   * @route GET /api/h5/time-templates
   */
  static getTemplates = asyncHandler(async (req, res) => {
    const { coach_id } = req.query;
    const currentUserId = req.user.id;

    // 如果没有指定教练ID，默认查询当前用户的模板
    const queryCoachId = coach_id || currentUserId;

    const templates = await TimeTemplate.findAll({
      where: { coach_id: queryCoachId },
      order: [['is_active', 'DESC'], ['createdAt', 'ASC']]
    });

    return ResponseUtil.success(res, templates, '获取时间模板成功');
  });

  /**
   * 获取单个时间模板详情
   * @route GET /api/h5/time-templates/:id
   */
  static getTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const template = await TimeTemplate.findByPk(id);
    if (!template) {
      return ResponseUtil.notFound(res, '时间模板不存在');
    }

    return ResponseUtil.success(res, template, '获取时间模板详情成功');
  });

  /**
   * 创建时间模板（仅教练可用）
   * @route POST /api/h5/time-templates
   */
  static createTemplate = asyncHandler(async (req, res) => {
    const coach_id = req.user.id;
    const { min_advance_days, max_advance_days, time_slots, is_active = 1 } = req.body;

    // 验证时间段格式
    for (const slot of time_slots) {
      if (!slot.startTime || !slot.endTime) {
        return ResponseUtil.validationError(res, '时间段必须包含开始时间和结束时间');
      }
      
      // 验证时间格式
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return ResponseUtil.validationError(res, '时间格式不正确，应为HH:mm');
      }
      
      // 验证结束时间大于开始时间
      if (slot.startTime >= slot.endTime) {
        return ResponseUtil.validationError(res, '结束时间必须大于开始时间');
      }
    }

    // 验证天数设置
    if (min_advance_days > max_advance_days) {
      return ResponseUtil.validationError(res, '最少提前天数不能大于最多预约天数');
    }

    // 如果设置为启用，先将其他模板设为禁用（一个教练只能有一个启用的模板）
    if (is_active) {
      await TimeTemplate.update(
        { is_active: 0 },
        { where: { coach_id, is_active: 1 } }
      );
    }

    const template = await TimeTemplate.create({
      coach_id,
      min_advance_days,
      max_advance_days,
      time_slots: JSON.stringify(time_slots),
      is_active
    });

    logger.info('时间模板创建:', { coachId: coach_id, templateId: template.id });

    return ResponseUtil.success(res, template, '时间模板创建成功');
  });

  /**
   * 更新时间模板
   * @route PUT /api/h5/time-templates/:id
   */
  static updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coach_id = req.user.id;
    const { min_advance_days, max_advance_days, time_slots, is_active } = req.body;

    const template = await TimeTemplate.findOne({
      where: { id, coach_id }
    });

    if (!template) {
      return ResponseUtil.notFound(res, '时间模板不存在或无权限修改');
    }

    const updateData = {};

    if (min_advance_days !== undefined) updateData.min_advance_days = min_advance_days;
    if (max_advance_days !== undefined) updateData.max_advance_days = max_advance_days;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (time_slots) {
      // 验证时间段格式
      for (const slot of time_slots) {
        if (!slot.startTime || !slot.endTime) {
          return ResponseUtil.validationError(res, '时间段必须包含开始时间和结束时间');
        }
        
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
          return ResponseUtil.validationError(res, '时间格式不正确，应为HH:mm');
        }
        
        if (slot.startTime >= slot.endTime) {
          return ResponseUtil.validationError(res, '结束时间必须大于开始时间');
        }
      }
      updateData.time_slots = JSON.stringify(time_slots);
    }

    // 验证天数设置
    const finalMinDays = updateData.min_advance_days ?? template.min_advance_days;
    const finalMaxDays = updateData.max_advance_days ?? template.max_advance_days;
    if (finalMinDays > finalMaxDays) {
      return ResponseUtil.validationError(res, '最少提前天数不能大于最多预约天数');
    }

    // 如果设置为启用，先将其他模板设为禁用
    if (is_active === 1) {
      await TimeTemplate.update(
        { is_active: 0 },
        { where: { coach_id, is_active: 1, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    await template.update(updateData);
    logger.info('时间模板更新:', { coachId: coach_id, templateId: id, updateData });

    return ResponseUtil.success(res, template, '时间模板更新成功');
  });

  /**
   * 删除时间模板
   * @route DELETE /api/h5/time-templates/:id
   */
  static deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coach_id = req.user.id;

    const template = await TimeTemplate.findOne({
      where: { id, coach_id }
    });

    if (!template) {
      return ResponseUtil.notFound(res, '时间模板不存在或无权限删除');
    }

    await template.destroy();
    logger.info('时间模板删除:', { coachId: coach_id, templateId: id });

    return ResponseUtil.success(res, null, '时间模板删除成功');
  });

  /**
   * 启用/禁用时间模板
   * @route PUT /api/h5/time-templates/:id/toggle
   */
  static toggleTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coach_id = req.user.id;

    const template = await TimeTemplate.findOne({
      where: { id, coach_id }
    });

    if (!template) {
      return ResponseUtil.notFound(res, '时间模板不存在或无权限修改');
    }

    const newStatus = template.is_active ? 0 : 1;

    // 如果要启用，先禁用其他模板
    if (newStatus === 1) {
      await TimeTemplate.update(
        { is_active: 0 },
        { where: { coach_id, is_active: 1 } }
      );
    }

    await template.update({ is_active: newStatus });
    logger.info('时间模板状态切换:', { coachId: coach_id, templateId: id, newStatus });

    return ResponseUtil.success(res, template, `时间模板${newStatus ? '启用' : '禁用'}成功`);
  });
}

module.exports = TimeTemplateController; 