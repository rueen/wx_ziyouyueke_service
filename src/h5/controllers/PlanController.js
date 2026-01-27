const { Plan, User, StudentCoachRelation } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 训练计划管理控制器
 */
class PlanController {
  /**
   * 获取训练计划列表
   * @route GET /api/h5/plans
   */
  static getPlanList = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { student_id, coach_id, is_visible, page = 1, page_size = 20 } = req.query;

    try {
      const where = {};
      const pageNum = parseInt(page);
      const pageSize = parseInt(page_size);
      const offset = (pageNum - 1) * pageSize;

      // 根据传入参数构建查询条件
      if (student_id) {
        where.student_id = parseInt(student_id);
      }

      if (coach_id) {
        where.coach_id = parseInt(coach_id);
      }

      // 如果没有传入任何筛选条件，查询当前用户相关的计划
      if (!student_id && !coach_id) {
        // 查询当前用户作为学员或教练的所有计划
        where[Op.or] = [
          { student_id: userId },
          { coach_id: userId }
        ];
      }

      // 按可见性筛选
      if (is_visible !== undefined) {
        where.is_visible = parseInt(is_visible);
      }

      // 查询训练计划列表
      const { count, rows } = await Plan.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: offset
      });

      const result = {
        list: rows,
        pagination: {
          total: count,
          page: pageNum,
          page_size: pageSize,
          total_pages: Math.ceil(count / pageSize)
        }
      };

      return ResponseUtil.success(res, result, '获取训练计划列表成功');

    } catch (error) {
      logger.error('获取训练计划列表失败:', {
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '获取训练计划列表失败');
    }
  });

  /**
   * 获取训练计划详情
   * @route GET /api/h5/plans/:id
   */
  static getPlanDetail = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;

    try {
      const plan = await Plan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ]
      });

      if (!plan) {
        return ResponseUtil.businessError(res, 4004, '训练计划不存在');
      }

      // 权限验证：只有学员本人或教练本人可以查看
      if (plan.student_id !== userId && plan.coach_id !== userId) {
        return ResponseUtil.businessError(res, 1003, '无权查看该训练计划');
      }

      return ResponseUtil.success(res, plan, '获取训练计划详情成功');

    } catch (error) {
      logger.error('获取训练计划详情失败:', {
        userId,
        planId: id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '获取训练计划详情失败');
    }
  });

  /**
   * 新增训练计划
   * @route POST /api/h5/plans
   */
  static createPlan = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { student_id, plan_name, plan_content, is_visible = 1 } = req.body;

    // 参数验证
    if (!student_id) {
      return ResponseUtil.validationError(res, '学员ID不能为空');
    }

    if (!plan_name || plan_name.trim() === '') {
      return ResponseUtil.validationError(res, '计划名称不能为空');
    }

    if (plan_name.length > 100) {
      return ResponseUtil.validationError(res, '计划名称不能超过100个字符');
    }

    try {
      // 验证学员是否存在
      const student = await User.findByPk(student_id);
      if (!student) {
        return ResponseUtil.businessError(res, 4004, '学员不存在');
      }

      // 验证师生关系
      const relation = await StudentCoachRelation.findOne({
        where: {
          student_id: student_id,
          coach_id: userId,
          relation_status: 1 // 有效关系
        }
      });

      if (!relation) {
        return ResponseUtil.businessError(res, 1003, '只能为自己的学员创建训练计划');
      }

      // 创建训练计划
      const plan = await Plan.create({
        student_id,
        coach_id: userId,
        plan_name: plan_name.trim(),
        plan_content: plan_content || null,
        is_visible: parseInt(is_visible) === 1 ? 1 : 0
      });

      logger.info('训练计划创建成功:', {
        planId: plan.id,
        coachId: userId,
        studentId: student_id,
        planName: plan_name,
        timestamp: new Date().toISOString()
      });

      // 返回包含关联信息的完整数据
      const planWithDetails = await Plan.findByPk(plan.id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ]
      });

      return ResponseUtil.success(res, planWithDetails, '训练计划创建成功');

    } catch (error) {
      logger.error('创建训练计划失败:', {
        userId,
        studentId: student_id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '创建训练计划失败');
    }
  });

  /**
   * 编辑训练计划
   * @route PUT /api/h5/plans/:id
   */
  static updatePlan = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const { plan_name, plan_content, is_visible } = req.body;

    try {
      // 查找训练计划
      const plan = await Plan.findByPk(id);
      if (!plan) {
        return ResponseUtil.businessError(res, 4004, '训练计划不存在');
      }

      // 验证权限（只有创建该计划的教练可以编辑）
      if (plan.coach_id !== userId) {
        return ResponseUtil.businessError(res, 1003, '只有创建该计划的教练可以编辑');
      }

      // 构建更新数据
      const updateData = {};

      if (plan_name !== undefined) {
        if (plan_name.trim() === '') {
          return ResponseUtil.validationError(res, '计划名称不能为空');
        }
        if (plan_name.length > 100) {
          return ResponseUtil.validationError(res, '计划名称不能超过100个字符');
        }
        updateData.plan_name = plan_name.trim();
      }

      if (plan_content !== undefined) {
        updateData.plan_content = plan_content;
      }

      if (is_visible !== undefined) {
        updateData.is_visible = parseInt(is_visible) === 1 ? 1 : 0;
      }

      // 更新训练计划
      await plan.update(updateData);

      logger.info('训练计划更新成功:', {
        planId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      // 返回包含关联信息的完整数据
      const planWithDetails = await Plan.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ]
      });

      return ResponseUtil.success(res, planWithDetails, '训练计划更新成功');

    } catch (error) {
      logger.error('更新训练计划失败:', {
        planId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '更新训练计划失败');
    }
  });

  /**
   * 删除训练计划
   * @route DELETE /api/h5/plans/:id
   */
  static deletePlan = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;

    try {
      // 查找训练计划
      const plan = await Plan.findByPk(id);
      if (!plan) {
        return ResponseUtil.businessError(res, 4004, '训练计划不存在');
      }

      // 验证权限（只有创建该计划的教练可以删除）
      if (plan.coach_id !== userId) {
        return ResponseUtil.businessError(res, 1003, '只有创建该计划的教练可以删除');
      }

      // 删除训练计划
      await plan.destroy();

      logger.info('训练计划删除成功:', {
        planId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, null, '训练计划删除成功');

    } catch (error) {
      logger.error('删除训练计划失败:', {
        planId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '删除训练计划失败');
    }
  });
}

module.exports = PlanController;
