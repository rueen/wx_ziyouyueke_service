const { TimeTemplate } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

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
   * 更新时间模板
   * @route PUT /api/h5/time-templates/:id
   */
  static updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const coach_id = req.user.id;
    const { min_advance_days, max_advance_days, max_advance_nums, time_slots, date_slots, is_active, time_type, week_slots, free_time_range } = req.body;

    const template = await TimeTemplate.findOne({
      where: { id, coach_id }
    });

    if (!template) {
      return ResponseUtil.notFound(res, '时间模板不存在或无权限修改');
    }

    const updateData = {};

    if (min_advance_days !== undefined) updateData.min_advance_days = min_advance_days;
    if (max_advance_days !== undefined) updateData.max_advance_days = max_advance_days;
    if (max_advance_nums !== undefined) updateData.max_advance_nums = max_advance_nums;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    if (time_type !== undefined) {
      updateData.time_type = parseInt(time_type);
    }
    
    if (week_slots !== undefined) {
      // 验证 week_slots 格式：只需要验证是否是数组
      if (!Array.isArray(week_slots)) {
        return ResponseUtil.validationError(res, 'week_slots 必须是数组格式');
      }
      updateData.week_slots = week_slots;
    }

    // 验证 free_time_range 格式（用于 time_type 为 2）
    if (free_time_range !== undefined) {
      if (free_time_range === null) {
        // 允许设置为 null
        updateData.free_time_range = null;
      } else {
        // 验证格式
        if (typeof free_time_range !== 'object' || Array.isArray(free_time_range)) {
          return ResponseUtil.validationError(res, 'free_time_range 必须是对象格式');
        }
        
        if (!free_time_range.startTime || !free_time_range.endTime) {
          return ResponseUtil.validationError(res, 'free_time_range 必须包含 startTime 和 endTime');
        }
        
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        if (!timeRegex.test(free_time_range.startTime) || !timeRegex.test(free_time_range.endTime)) {
          return ResponseUtil.validationError(res, 'free_time_range 时间格式不正确，应为HH:mm');
        }
        
        if (free_time_range.startTime >= free_time_range.endTime) {
          return ResponseUtil.validationError(res, 'free_time_range 结束时间必须大于开始时间');
        }
        
        updateData.free_time_range = free_time_range;
      }
    }

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
      updateData.time_slots = time_slots;
    }

    if (date_slots) {
      // 验证日期配置格式
      if (!Array.isArray(date_slots)) {
        return ResponseUtil.validationError(res, '日期配置必须是数组格式');
      }
      
      for (const slot of date_slots) {
        if (typeof slot.id !== 'number' || typeof slot.text !== 'string' || typeof slot.checked !== 'boolean') {
          return ResponseUtil.validationError(res, '日期配置格式不正确，必须包含id、text和checked字段');
        }
        
        // 验证id范围（0-6代表周日至周六）
        if (slot.id < 0 || slot.id > 6) {
          return ResponseUtil.validationError(res, '日期配置的id必须在0-6范围内');
        }
      }
      updateData.date_slots = date_slots;
    }

    // 验证天数设置
    const finalMinDays = updateData.min_advance_days ?? template.min_advance_days;
    const finalMaxDays = updateData.max_advance_days ?? template.max_advance_days;
    if (finalMinDays > finalMaxDays) {
      return ResponseUtil.validationError(res, '最少提前天数不能大于最多预约天数');
    }

    // 验证预约人数设置
    const finalMaxNums = updateData.max_advance_nums ?? template.max_advance_nums;
    if (finalMaxNums < 1) {
      return ResponseUtil.validationError(res, '同时段最多可预约人数不能小于1');
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