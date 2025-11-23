const { StudentCardInstance, CoachCard, User, StudentCoachRelation, CourseBooking, sequelize } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 卡片实例控制器
 */
class CardInstanceController {
  /**
   * 为学员添加卡片实例（教练操作）
   * @route POST /api/h5/card-instances
   */
  static createInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { 
      student_id,
      relation_id,
      coach_card_id
    } = req.body;

    // 参数验证
    if (!student_id || !relation_id || !coach_card_id) {
      return ResponseUtil.validationError(res, '缺少必要参数');
    }

    // 验证师生关系
    const relation = await StudentCoachRelation.findOne({
      where: {
        id: relation_id,
        student_id: student_id,
        coach_id: coachId,
        relation_status: 1
      }
    });

    if (!relation) {
      return ResponseUtil.forbidden(res, '师生关系不存在或已禁用');
    }

    // 验证卡片模板
    const coachCard = await CoachCard.findOne({
      where: {
        id: coach_card_id,
        coach_id: coachId,
        is_active: 1 // 只能使用启用的卡片模板
      }
    });

    if (!coachCard) {
      return ResponseUtil.notFound(res, '卡片模板不存在或已禁用');
    }

    // 从模板创建卡片实例
    const instance = await StudentCardInstance.createFromTemplate(
      coachCard, 
      student_id, 
      coachId, 
      relation_id
    );

    logger.info('卡片实例创建成功:', {
      instanceId: instance.id,
      coachId,
      studentId: student_id,
      coachCardId: coach_card_id
    });

    const instanceSummary = await instance.getSummary();
    return ResponseUtil.success(res, instanceSummary, '卡片添加成功');
  });

  /**
   * 开卡（教练操作）
   * @route PUT /api/h5/card-instances/:id/activate
   */
  static activateInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const instance = await StudentCardInstance.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限操作');
    }

    try {
      await instance.activate();
      
      logger.info('卡片开启成功:', {
        instanceId: instance.id,
        coachId,
        studentId: instance.student_id
      });

      const instanceSummary = await instance.getSummary();
      return ResponseUtil.success(res, instanceSummary, '开卡成功');
    } catch (error) {
      logger.error('开卡失败:', { instanceId: id, error: error.message });
      return ResponseUtil.validationError(res, error.message);
    }
  });

  /**
   * 停卡（教练操作）
   * @route PUT /api/h5/card-instances/:id/deactivate
   */
  static deactivateInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const instance = await StudentCardInstance.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限操作');
    }

    try {
      await instance.deactivate();
      
      logger.info('卡片停用成功:', {
        instanceId: instance.id,
        coachId,
        studentId: instance.student_id
      });

      const instanceSummary = await instance.getSummary();
      return ResponseUtil.success(res, instanceSummary, '停卡成功');
    } catch (error) {
      logger.error('停卡失败:', { instanceId: id, error: error.message });
      return ResponseUtil.validationError(res, error.message);
    }
  });

  /**
   * 重新开启卡片（教练操作）
   * @route PUT /api/h5/card-instances/:id/reactivate
   */
  static reactivateInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const instance = await StudentCardInstance.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限操作');
    }

    try {
      await instance.reactivate();
      
      logger.info('卡片重新开启成功:', {
        instanceId: instance.id,
        coachId,
        studentId: instance.student_id
      });

      const instanceSummary = await instance.getSummary();
      return ResponseUtil.success(res, instanceSummary, '卡片重新开启成功');
    } catch (error) {
      logger.error('重新开启卡片失败:', { instanceId: id, error: error.message });
      return ResponseUtil.validationError(res, error.message);
    }
  });

  /**
   * 删除卡片实例（教练操作）
   * @route DELETE /api/h5/card-instances/:id
   */
  static deleteInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const instance = await StudentCardInstance.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限操作');
    }

    // 检查是否可以删除
    const { canDelete, reason } = await instance.canDelete();
    
    if (!canDelete) {
      return ResponseUtil.validationError(res, reason);
    }

    // 物理删除
    await instance.destroy();
    
    logger.info('卡片实例删除成功:', {
      instanceId: instance.id,
      coachId,
      studentId: instance.student_id
    });

    return ResponseUtil.success(res, null, '卡片删除成功');
  });

  /**
   * 获取指定学员的卡片实例列表（教练视角）
   * @route GET /api/h5/card-instances/student/:studentId
   */
  static getStudentInstances = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { studentId } = req.params;

    // 验证师生关系
    const relation = await StudentCoachRelation.findOne({
      where: {
        student_id: studentId,
        coach_id: coachId,
        relation_status: 1
      }
    });

    if (!relation) {
      return ResponseUtil.forbidden(res, '师生关系不存在');
    }

    // 查询卡片实例列表，已过期的排在最后
    const instances = await StudentCardInstance.findAll({
      where: {
        student_id: studentId,
        coach_id: coachId
      },
      order: [
        // 先按状态排序：已开启(1) > 未开启(0) > 已停用(2) > 已过期(3)
        [sequelize.literal(`CASE 
          WHEN card_status = 1 THEN 1 
          WHEN card_status = 0 THEN 2 
          WHEN card_status = 2 THEN 3 
          WHEN card_status = 3 THEN 4 
          ELSE 5 
        END`), 'ASC'],
        // 再按创建时间倒序
        ['createdAt', 'DESC']
      ]
    });

    const instanceList = await Promise.all(instances.map(instance => instance.getSummary()));

    return ResponseUtil.success(res, {
      list: instanceList,
      total: instanceList.length
    }, '获取卡片列表成功');
  });

  /**
   * 获取我的卡片实例列表（学员视角）
   * @route GET /api/h5/card-instances/my-cards/:coachId
   */
  static getMyInstances = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const { coachId } = req.params;

    // 验证师生关系
    const relation = await StudentCoachRelation.findOne({
      where: {
        student_id: studentId,
        coach_id: coachId,
        relation_status: 1
      }
    });

    if (!relation) {
      return ResponseUtil.forbidden(res, '师生关系不存在');
    }

    // 查询卡片实例列表，已过期的排在最后
    const instances = await StudentCardInstance.findAll({
      where: {
        student_id: studentId,
        coach_id: coachId
      },
      order: [
        // 先按状态排序：已开启(1) > 未开启(0) > 已停用(2) > 已过期(3)
        [sequelize.literal(`CASE 
          WHEN card_status = 1 THEN 1 
          WHEN card_status = 0 THEN 2 
          WHEN card_status = 2 THEN 3 
          WHEN card_status = 3 THEN 4 
          ELSE 5 
        END`), 'ASC'],
        // 再按创建时间倒序
        ['createdAt', 'DESC']
      ]
    });

    const instanceList = await Promise.all(instances.map(instance => instance.getSummary()));

    return ResponseUtil.success(res, {
      list: instanceList,
      total: instanceList.length
    }, '获取卡片列表成功');
  });

  /**
   * 获取卡片实例详情
   * @route GET /api/h5/card-instances/:id
   */
  static getInstanceDetail = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const instance = await StudentCardInstance.findOne({
      where: {
        id,
        [Op.or]: [
          { student_id: userId },
          { coach_id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url']
        },
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url']
        }
      ]
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限查看');
    }

    // 获取使用记录（最近10条）
    const usageRecords = await CourseBooking.findAll({
      where: {
        card_instance_id: id
      },
      order: [['course_date', 'DESC'], ['start_time', 'DESC']],
      limit: 10,
      attributes: ['id', 'course_date', 'start_time', 'end_time', 'booking_status', 'complete_at']
    });

    const instanceSummary = await instance.getSummary();
    const instanceDetail = {
      ...instanceSummary,
      student: instance.student,
      coach: instance.coach,
      usage_records: usageRecords
    };

    return ResponseUtil.success(res, instanceDetail, '获取卡片详情成功');
  });

  /**
   * 获取可用的卡片实例列表（用于约课）
   * @route GET /api/h5/card-instances/available
   * @query student_id - 学员ID（必填）
   * @query coach_id - 教练ID（必填）
   */
  static getAvailableInstances = asyncHandler(async (req, res) => {
    const { student_id, coach_id } = req.query;

    // 参数验证
    if (!student_id || !coach_id) {
      return ResponseUtil.validationError(res, '缺少必要参数：student_id 和 coach_id');
    }

    const studentId = parseInt(student_id);
    const coachId = parseInt(coach_id);

    // 验证师生关系
    const relation = await StudentCoachRelation.findOne({
      where: {
        student_id: studentId,
        coach_id: coachId,
        relation_status: 1
      }
    });

    if (!relation) {
      return ResponseUtil.forbidden(res, '师生关系不存在');
    }

    const moment = require('moment-timezone');
    const now = moment.tz('Asia/Shanghai').startOf('day').format('YYYY-MM-DD');

    // 查询可用的卡片（已开启且未过期且有课时）
    const instances = await StudentCardInstance.findAll({
      where: {
        student_id: studentId,
        coach_id: coachId,
        card_status: 1, // 已开启
        [Op.and]: [
          {
            [Op.or]: [
              { expire_date: null }, // 未开卡（理论上不会出现，因为状态是已开启）
              { expire_date: { [Op.gte]: now } } // 未过期
            ]
          },
          {
            [Op.or]: [
              { total_lessons: null }, // 无限次数
              { remaining_lessons: { [Op.gt]: 0 } } // 有剩余课时
            ]
          }
        ]
      },
      order: [
        [sequelize.literal('CASE WHEN expire_date IS NULL THEN 1 ELSE 0 END'), 'ASC'], // 有到期日期的排前面
        ['expire_date', 'ASC'] // 先到期的排在前面
      ]
    });

    const instanceList = await Promise.all(instances.map(instance => instance.getSummary()));

    return ResponseUtil.success(res, {
      list: instanceList,
      total: instanceList.length
    }, '获取可用卡片列表成功');
  });
}

module.exports = CardInstanceController;

