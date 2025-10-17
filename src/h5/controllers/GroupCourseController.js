/*
 * @Author: diaochan
 * @Date: 2025-10-09 19:16:44
 * @LastEditors: diaochan
 * @LastEditTime: 2025-10-17 18:24:50
 * @Description: 
 */
const { GroupCourse, GroupCourseRegistration, User, Address, StudentCoachRelation } = require('../../shared/models');
const ResponseUtil = require('../../shared/utils/response');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 团课控制器
 */
class GroupCourseController {

  /**
   * 创建团课
   * POST /api/h5/group-courses
   */
  static createGroupCourse = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const {
      category_id = 0,
      title,
      content,
      cover_images = [],
      images = [],
      course_date,
      start_time,
      end_time,
      duration,
      address_id,
      max_participants = 10,
      min_participants = 1,
      price_type = 1,
      lesson_cost = 1,
      price_amount = 0,
      enrollment_scope = 1,
      auto_confirm = 1
    } = req.body;

    // 验证教练的课程分类
    const coach = await User.findByPk(coachId);
    if (!coach) {
      return ResponseUtil.notFound(res, '教练不存在');
    }

    const categories = coach.course_categories || [];
    const categoryExists = categories.some(cat => cat.id === category_id);
    if (!categoryExists) {
      return ResponseUtil.validationError(res, '课程分类不存在');
    }

    // 验证地址
    if (address_id) {
      const address = await Address.findByPk(address_id);
      if (!address) {
        return ResponseUtil.validationError(res, '地址不存在');
      }
    }

    // 创建团课（默认为草稿状态）
    const groupCourse = await GroupCourse.create({
      coach_id: coachId,
      category_id,
      title,
      content,
      cover_images: cover_images || [],
      images: images || [],
      course_date,
      start_time,
      end_time,
      duration,
      address_id,
      max_participants,
      min_participants,
      price_type,
      lesson_cost,
      price_amount,
      enrollment_scope,
      auto_confirm,
      // 默认为草稿状态（status = 0）
      status: 0 // 草稿状态：0-待发布
    });

    logger.info(`教练 ${coachId} 创建团课成功，团课ID: ${groupCourse.id}`);
    return ResponseUtil.success(res, groupCourse, '团课创建成功');
  });

  /**
   * 获取团课列表
   * GET /api/h5/group-courses
   */
  static getGroupCourseList = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      coach_id,
      category_id,
      status,
      course_date_start,
      course_date_end
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};
    
    // 状态筛选逻辑
    if (status !== undefined) {
      let statusArray;
      
      // 解析状态参数，支持单个值和数组格式
      if (typeof status === 'string') {
        try {
          // 尝试解析为JSON数组
          const parsed = JSON.parse(status);
          statusArray = Array.isArray(parsed) ? parsed.map(s => parseInt(s)) : [parseInt(status)];
        } catch {
          // 如果不是JSON格式，则当作单个值处理
          statusArray = [parseInt(status)];
        }
      } else {
        statusArray = Array.isArray(status) ? status.map(s => parseInt(s)) : [parseInt(status)];
      }
      
      // 确保 statusArray 是数组
      if (!Array.isArray(statusArray)) {
        statusArray = [statusArray];
      }
      
      // 检查是否包含草稿状态（0）
      const hasDraftStatus = statusArray.includes(0);
      
      if (hasDraftStatus) {
        // 如果包含草稿状态，必须是登录用户且只能查看自己的
        if (!req.user) {
          return ResponseUtil.unauthorized(res, '查看草稿需要登录');
        }
        where.coach_id = req.user.id;
      }
      
      // 设置状态筛选条件
      if (statusArray.length === 1) {
        where.status = statusArray[0];
      } else {
        where.status = {
          [Op.in]: statusArray
        };
      }
    } else {
      // 默认只显示已发布的团课（status > 0）
      where.status = {
        [Op.gt]: 0
      };
    }

    // 筛选条件
    if (coach_id) where.coach_id = coach_id;
    if (category_id !== undefined) where.category_id = category_id;
    
    // 日期范围筛选
    if (course_date_start && course_date_end) {
      where.course_date = {
        [Op.between]: [course_date_start, course_date_end]
      };
    } else if (course_date_start) {
      where.course_date = {
        [Op.gte]: course_date_start
      };
    } else if (course_date_end) {
      where.course_date = {
        [Op.lte]: course_date_end
      };
    }

    // 分别查询总数和数据
    const total = await GroupCourse.count({ where });
    const courses = await GroupCourse.findAll({
      where,
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url', 'course_categories']
        },
        {
          model: Address,
          as: 'address',
          attributes: ['id', 'name', 'address', 'latitude', 'longitude']
        },
        {
          model: GroupCourseRegistration,
          as: 'registrations',
          required: false,
          include: [{
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          }]
        }
      ],
      order: [['course_date', 'ASC'], ['start_time', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    // 为已结束的团课添加结束原因
    const coursesWithEndReason = courses.map(course => {
      const courseData = course.toJSON();
      courseData.end_reason = course.getEndReason();
      return courseData;
    });

    return ResponseUtil.success(res, {
      list: coursesWithEndReason,
      page: parseInt(page),
      pageSize: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    });
  });

  /**
   * 获取团课详情
   * GET /api/h5/group-courses/:id
   */
  static getGroupCourseDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await GroupCourse.findByPk(id, {
      include: [
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'course_categories']
        },
        {
          model: Address,
          as: 'address',
          attributes: ['id', 'name', 'address', 'latitude', 'longitude']
        },
        {
          model: GroupCourseRegistration,
          as: 'registrations',
          where: { registration_status: [1, 2, 3] }, // 有效报名
          required: false,
          include: [{
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          }]
        }
      ]
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在');
    }

    // 为已结束的团课添加结束原因
    const courseData = course.toJSON();
    courseData.end_reason = course.getEndReason();

    return ResponseUtil.success(res, courseData);
  });

  /**
   * 更新团课
   * PUT /api/h5/group-courses/:id
   */
  static updateGroupCourse = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const course = await GroupCourse.findOne({
      where: { id, coach_id: coachId }
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在或无权限');
    }

    // 已开始的课程不能修改核心信息
    if (course.status !== 1) {
      return ResponseUtil.validationError(res, '课程已开始，无法修改');
    }

    const updateData = req.body;
    
    // 验证课程分类
    if (updateData.category_id !== undefined) {
      const coach = await User.findByPk(coachId);
      const categories = coach.course_categories || [];
      const categoryExists = categories.some(cat => cat.id === updateData.category_id);
      if (!categoryExists) {
        return ResponseUtil.validationError(res, '课程分类不存在');
      }
    }

    await course.update(updateData);
    
    logger.info(`教练 ${coachId} 更新团课 ${id} 成功`);
    return ResponseUtil.success(res, course, '团课更新成功');
  });

  /**
   * 发布团课
   * PUT /api/h5/group-courses/:id/publish
   */
  static publishGroupCourse = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const course = await GroupCourse.findOne({
      where: { id, coach_id: coachId }
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在或无权限');
    }

    if (course.status !== 0) {
      return ResponseUtil.validationError(res, '只能发布草稿状态的团课');
    }

    // 发布团课
    await course.update({
      status: 1, // 发布后状态改为报名中
      published_at: new Date()
    });
    
    logger.info(`教练 ${coachId} 发布团课 ${id}`);
    return ResponseUtil.success(res, course, '团课发布成功');
  });

  /**
   * 取消团课
   * PUT /api/h5/group-courses/:id/cancel
   */
  static cancelGroupCourse = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;
    const { cancel_reason = '教练取消' } = req.body;

    const course = await GroupCourse.findOne({
      where: { id, coach_id: coachId }
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在或无权限');
    }

    if (course.status !== 1) {
      return ResponseUtil.validationError(res, '只能取消报名中的团课');
    }

    await course.cancelCourse(cancel_reason);
    
    logger.info(`教练 ${coachId} 取消团课 ${id}，原因: ${cancel_reason}`);
    return ResponseUtil.success(res, null, '团课取消成功');
  });

  /**
   * 删除团课
   * DELETE /api/h5/group-courses/:id
   */
  static deleteGroupCourse = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const course = await GroupCourse.findOne({
      where: { id, coach_id: coachId }
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在或无权限');
    }

    // 检查是否可以删除的条件：
    // 1. 已取消/人数不足取消的团课可以删除
    // 2. 无人报名的团课可以删除
    if (course.status === 1 && course.current_participants > 0) {
      return ResponseUtil.validationError(res, '有学员报名的团课不能删除，请先取消团课');
    }

    // 删除团课（真删除）
    await course.destroy();
    
    logger.info(`教练 ${coachId} 删除团课 ${id}`);
    return ResponseUtil.success(res, null, '团课删除成功');
  });

  /**
   * 报名团课
   * POST /api/h5/group-courses/:id/register
   */
  static registerGroupCourse = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const { id: groupCourseId } = req.params;

    const course = await GroupCourse.findByPk(groupCourseId, {
      include: [{
        model: User,
        as: 'coach',
        attributes: ['id', 'course_categories']
      }]
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在');
    }

    // 检查是否可以报名
    if (!course.canEnroll()) {
      return ResponseUtil.validationError(res, '当前团课不可报名');
    }

    // 检查是否已报名
    const existingRegistration = await GroupCourseRegistration.findOne({
      where: {
        group_course_id: groupCourseId,
        student_id: studentId
      }
    });

    if (existingRegistration) {
      return ResponseUtil.validationError(res, '您已报名该团课');
    }

    let relationId = null;
    
    // 如果是仅学员可报名，需要验证师生关系
    if (course.enrollment_scope === 1) {
      const relation = await StudentCoachRelation.findOne({
        where: {
          student_id: studentId,
          coach_id: course.coach_id
        }
      });

      if (!relation) {
        return ResponseUtil.validationError(res, '您不是该教练的学员，无法报名');
      }

      relationId = relation.id;

      // 如果是扣课时的团课，检查课时是否足够
      if (course.price_type === 1) {
        const availableLessons = await relation.getAvailableLessons(course.category_id);
        if (availableLessons < course.lesson_cost) {
          return ResponseUtil.validationError(res, '该分类可用课时不足，无法报名团课');
        }
      }
    }

    // 创建报名记录
    const registration = await GroupCourseRegistration.create({
      group_course_id: groupCourseId,
      student_id: studentId,
      coach_id: course.coach_id,
      relation_id: relationId,
      payment_type: course.price_type,
      registration_status: course.auto_confirm ? 2 : 1 // 自动确认或待确认
    });

    // 如果自动确认，增加参与人数
    if (course.auto_confirm) {
      await course.increaseParticipants(1);
      registration.confirmed_at = new Date();
      await registration.save();
    }

    logger.info(`学员 ${studentId} 报名团课 ${groupCourseId} 成功`);
    return ResponseUtil.success(res, registration, '报名成功');
  });

  /**
   * 取消报名
   * DELETE /api/h5/group-courses/:id/register
   */
  static cancelRegistration = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const { id: groupCourseId } = req.params;

    const registration = await GroupCourseRegistration.findOne({
      where: {
        group_course_id: groupCourseId,
        student_id: studentId,
        registration_status: [1, 2] // 待确认或已确认
      },
      include: [{
        model: GroupCourse,
        as: 'groupCourse'
      }]
    });

    if (!registration) {
      return ResponseUtil.notFound(res, '报名记录不存在或已取消');
    }

    // 如果已确认报名，需要减少团课参与人数
    if (registration.registration_status === 2) {
      await registration.groupCourse.decreaseParticipants(1);
    }

    // 直接删除报名记录
    await registration.destroy();
    
    logger.info(`学员 ${studentId} 取消团课 ${groupCourseId} 报名（真删除）`);
    return ResponseUtil.success(res, null, '取消报名成功');
  });

  /**
   * 获取我的团课报名列表（学员视角）
   * GET /api/h5/group-courses/my-registrations
   */
  static getMyRegistrations = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;
    const where = { student_id: studentId };
    
    if (status) where.registration_status = status;

    const { rows: registrations, count: total } = await GroupCourseRegistration.findAndCountAll({
      where,
      include: [
        {
          model: GroupCourse,
          as: 'groupCourse',
          include: [
            {
              model: User,
              as: 'coach',
              attributes: ['id', 'nickname', 'avatar_url']
            },
            {
              model: Address,
              as: 'address',
              attributes: ['id', 'name', 'address']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return ResponseUtil.success(res, {
      registrations,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * 获取团课报名列表（教练视角）
   * GET /api/h5/group-courses/:id/registrations
   */
  static getCourseRegistrations = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id: groupCourseId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // 验证权限
    const course = await GroupCourse.findOne({
      where: { id: groupCourseId, coach_id: coachId }
    });

    if (!course) {
      return ResponseUtil.notFound(res, '团课不存在或无权限');
    }

    const offset = (page - 1) * limit;
    const where = { group_course_id: groupCourseId };
    
    if (status) where.registration_status = status;

    const { rows: registrations, count: total } = await GroupCourseRegistration.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        },
        {
          model: StudentCoachRelation,
          as: 'relation',
          attributes: ['id', 'student_remark', 'coach_remark']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    return ResponseUtil.success(res, {
      registrations,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * 签到团课
   * POST /api/h5/group-courses/:courseId/registrations/:registrationId/check-in
   */
  static checkInRegistration = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { courseId, registrationId } = req.params;

    // 验证权限和记录
    const registration = await GroupCourseRegistration.findOne({
      where: {
        id: registrationId,
        group_course_id: courseId,
        coach_id: coachId,
        registration_status: 2 // 已确认
      }
    });

    if (!registration) {
      return ResponseUtil.notFound(res, '报名记录不存在或无权限');
    }

    if (registration.check_in_status !== 0) {
      return ResponseUtil.validationError(res, '该学员已签到或已标记缺席');
    }

    await registration.checkIn(coachId);
    
    logger.info(`教练 ${coachId} 为学员 ${registration.student_id} 签到团课 ${courseId}`);
    return ResponseUtil.success(res, registration, '签到成功');
  });

}

module.exports = GroupCourseController;
