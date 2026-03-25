const { StudentCardInstance, CoachCard, User, StudentCoachRelation, CourseBooking, GroupCourseRegistration, GroupCourse, sequelize } = require('../../shared/models');
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
   * 修改卡片实例信息（教练操作，目前支持修改过期时间）
   * 修改 expire_date 后自动联动 card_status / remaining_valid_days
   * @route PUT /api/h5/card-instances/:id
   */
  static updateInstance = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;
    const { expire_date } = req.body;

    // 目前至少需要提供 expire_date
    if (!expire_date) {
      return ResponseUtil.validationError(res, '缺少修改内容，目前支持修改：expire_date');
    }

    const moment = require('moment-timezone');

    // 校验日期格式
    if (!moment(expire_date, 'YYYY-MM-DD', true).isValid()) {
      return ResponseUtil.validationError(res, '过期时间格式错误，请使用 YYYY-MM-DD 格式');
    }

    const instance = await StudentCardInstance.findOne({
      where: { id, coach_id: coachId }
    });

    if (!instance) {
      return ResponseUtil.notFound(res, '卡片不存在或无权限操作');
    }

    // 未开卡(0)的卡片 expire_date 在开卡时自动计算，不允许手动提前修改
    if (instance.card_status === 0) {
      return ResponseUtil.validationError(res, '未开启的卡片无法修改过期时间，请先开卡');
    }

    const today = moment.tz('Asia/Shanghai').startOf('day');
    const newExpireEnd = moment.tz(expire_date, 'Asia/Shanghai').endOf('day');
    const isExpired = today.isAfter(newExpireEnd);

    const oldExpireDate = instance.expire_date;
    const oldStatus = instance.card_status;

    /** @type {Object} 需要更新的字段 */
    const updates = { expire_date };

    if (instance.card_status === 1) {
      // 已开启：新到期日已过 → 标记过期
      if (isExpired) {
        updates.card_status = 3;
      }
    } else if (instance.card_status === 3) {
      // 已过期：新到期日未过 → 恢复已开启
      if (!isExpired) {
        updates.card_status = 1;
      }
    } else if (instance.card_status === 2) {
      if (isExpired) {
        // 已停用：新到期日已过 → 标记过期
        updates.card_status = 3;
      } else {
        // 已停用：重新计算剩余有效天数
        updates.remaining_valid_days = Math.max(
          newExpireEnd.diff(today, 'days'),
          0
        );
      }
    }

    await instance.update(updates);

    logger.info('卡片过期时间修改成功:', {
      instanceId: instance.id,
      coachId,
      studentId: instance.student_id,
      oldExpireDate,
      newExpireDate: expire_date,
      statusChange: updates.card_status !== undefined
        ? `${oldStatus} → ${updates.card_status}`
        : '无变化'
    });

    const instanceSummary = await instance.getSummary();
    return ResponseUtil.success(res, instanceSummary, '卡片信息修改成功');
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

    // 获取每个卡片实例的详细信息
    const instanceList = await Promise.all(instances.map(async (instance) => {
      const summary = await instance.getSummary();
      
      // 获取已使用次数（所有使用记录的条数）
      const usageCount = await CourseBooking.count({
        where: {
          card_instance_id: instance.id
        }
      });
      
      // 获取实际可预约的课时数量
      const availableLessons = await instance.getAvailableLessons();
      
      return {
        ...summary,
        usage_count: usageCount, // 已使用次数
        available_lessons: availableLessons // 实际可预约的课时数量
      };
    }));

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

    // 获取每个卡片实例的详细信息
    const instanceList = await Promise.all(instances.map(async (instance) => {
      const summary = await instance.getSummary();
      
      // 获取已使用次数（所有使用记录的条数）
      const usageCount = await CourseBooking.count({
        where: {
          card_instance_id: instance.id
        }
      });
      
      // 获取实际可预约的课时数量
      const availableLessons = await instance.getAvailableLessons();
      
      return {
        ...summary,
        usage_count: usageCount, // 已使用次数
        available_lessons: availableLessons // 实际可预约的课时数量
      };
    }));

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

    // 获取一对一课程使用记录
    const courseRecords = await CourseBooking.findAll({
      where: { card_instance_id: id },
      order: [['course_date', 'DESC'], ['start_time', 'DESC']],
      attributes: ['id', 'course_date', 'start_time', 'end_time', 'booking_status', 'complete_at']
    });

    // 获取团课使用记录
    const groupCourseRecords = await GroupCourseRegistration.findAll({
      where: {
        card_instance_id: id,
        registration_status: 1
      },
      include: [{
        model: GroupCourse,
        as: 'groupCourse',
        attributes: ['id', 'title', 'course_date', 'start_time', 'end_time']
      }],
      attributes: ['id', 'check_in_status', 'check_in_time']
    });

    // 统一格式：record_type 区分来源
    const normalizedCourse = courseRecords.map(r => ({
      id: r.id,
      record_type: 'course',
      title: null,
      course_date: r.course_date,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.booking_status,
      complete_at: r.complete_at
    }));

    const normalizedGroup = groupCourseRecords.map(r => ({
      id: r.groupCourse ? r.groupCourse.id : null, // 团课ID
      registration_id: r.id,                       // 报名记录ID
      record_type: 'group_course',
      title: r.groupCourse ? r.groupCourse.title : null,
      course_date: r.groupCourse ? r.groupCourse.course_date : null,
      start_time: r.groupCourse ? r.groupCourse.start_time : null,
      end_time: r.groupCourse ? r.groupCourse.end_time : null,
      status: r.check_in_status, // 0-未签到，1-已签到，2-缺席
      complete_at: r.check_in_time
    }));

    // 合并后按日期倒序排列，取最近 200 条
    const usageRecords = [...normalizedCourse, ...normalizedGroup]
      .sort((a, b) => {
        if (a.course_date !== b.course_date) {
          return (b.course_date || '') > (a.course_date || '') ? 1 : -1;
        }
        return (b.start_time || '') > (a.start_time || '') ? 1 : -1;
      })
      .slice(0, 200);

    /**
     * 已使用次数：一对一约课记录条数（与列表接口 usage_count 口径一致）
     */
    const usageCount = await CourseBooking.count({
      where: {
        card_instance_id: id
      }
    });
    // 获取实际可预约的课时数量
    const availableLessons = await instance.getAvailableLessons();

    const instanceSummary = await instance.getSummary();
    const instanceDetail = {
      ...instanceSummary,
      student: instance.student,
      coach: instance.coach,
      usage_records: usageRecords,
      usage_count: usageCount, // 已使用次数
      available_lessons: availableLessons // 实际可预约的课时数量
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

    // 查询可用的卡片：已开启(1) + 未开卡(0)，均要求有剩余课时
    // 未开卡的卡片 expire_date 为 null，不做到期检查；已开启的检查有效期
    const instances = await StudentCardInstance.findAll({
      where: {
        student_id: studentId,
        coach_id: coachId,
        card_status: { [Op.in]: [0, 1] }, // 未开启(0) + 已开启(1)
        [Op.and]: [
          {
            [Op.or]: [
              { card_status: 0 },                    // 未开卡，不受到期日期限制
              { expire_date: null },                  // 无到期限制
              { expire_date: { [Op.gte]: now } }      // 已开卡且未过期
            ]
          },
          {
            [Op.or]: [
              { total_lessons: null },               // 无限次数
              { remaining_lessons: { [Op.gt]: 0 } }  // 有剩余课时
            ]
          }
        ]
      },
      order: [
        // 已开启(1) 排在未开卡(0) 前面
        [sequelize.literal('CASE WHEN card_status = 1 THEN 1 WHEN card_status = 0 THEN 2 ELSE 3 END'), 'ASC'],
        [sequelize.literal('CASE WHEN expire_date IS NULL THEN 1 ELSE 0 END'), 'ASC'], // 有到期日期的排前面
        ['expire_date', 'ASC'] // 先到期的排在前面
      ]
    });

    // 为每个卡片添加可用课时信息
    const instanceList = await Promise.all(instances.map(async instance => {
      const summary = await instance.getSummary();
      summary.available_lessons = await instance.getAvailableLessons(); // 添加可用课时
      return summary;
    }));

    return ResponseUtil.success(res, {
      list: instanceList,
      total: instanceList.length
    }, '获取可用卡片列表成功');
  });
}

module.exports = CardInstanceController;

