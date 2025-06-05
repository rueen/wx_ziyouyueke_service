const { User, CourseBooking, StudentCoachRelation, TimeTemplate } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * 课程管理控制器
 */
class CourseController {
  /**
   * 预约课程
   * @route POST /api/h5/courses
   */
  static createBooking = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { 
      coach_id, 
      booking_date, 
      start_time, 
      end_time, 
      notes = '' 
    } = req.body;

    try {
      // 参数验证
      if (!coach_id || !booking_date || !start_time || !end_time) {
        return ResponseUtil.validationError(res, '缺少必要参数');
      }

      // 验证教练是否存在（通过师生关系表或时间模板表）
      const [hasRelation, hasTemplate] = await Promise.all([
        StudentCoachRelation.count({ where: { coach_id: coach_id } }),
        TimeTemplate.count({ where: { coach_id: coach_id, is_active: true } })
      ]);

      if (hasRelation === 0 && hasTemplate === 0) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      const coach = await User.findByPk(coach_id);

      if (!coach) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      // 验证师生关系
      const relation = await StudentCoachRelation.findOne({
        where: {
          student_id: userId,
          coach_id: coach_id,
          relation_status: 1
        }
      });

      if (!relation) {
        return ResponseUtil.forbidden(res, '您未与该教练建立师生关系');
      }

      // 检查剩余课时
      if (relation.remaining_lessons <= 0) {
        return ResponseUtil.validationError(res, '剩余课时不足');
      }

      // 检查时间冲突（同一教练同一时间不能有其他预约）
      const conflictBooking = await CourseBooking.findOne({
        where: {
          coach_id: coach_id,
          course_date: booking_date,
          [Op.or]: [
            {
              start_time: {
                [Op.lt]: end_time
              },
              end_time: {
                [Op.gt]: start_time
              }
            }
          ],
          booking_status: {
            [Op.in]: [1, 2, 3] // 待确认、已确认、进行中
          }
        }
      });

      if (conflictBooking) {
        return ResponseUtil.validationError(res, '该时间段已被预约');
      }

      // 检查学员自己的时间冲突
      const studentConflict = await CourseBooking.findOne({
        where: {
          student_id: userId,
          course_date: booking_date,
          [Op.or]: [
            {
              start_time: {
                [Op.lt]: end_time
              },
              end_time: {
                [Op.gt]: start_time
              }
            }
          ],
          booking_status: {
            [Op.in]: [1, 2, 3]
          }
        }
      });

      if (studentConflict) {
        return ResponseUtil.validationError(res, '您在该时间段已有其他预约');
      }

      // 创建预约
      const booking = await CourseBooking.create({
        student_id: userId,
        coach_id: coach_id,
        course_date: booking_date,
        start_time: start_time,
        end_time: end_time,
        booking_status: 1, // 待确认
        notes: notes,
        created_by: userId
      });

      // 更新剩余课时（暂时减1，如果取消会恢复）
      await relation.decrement('remaining_lessons', { by: 1 });

      logger.info('课程预约成功:', { 
        bookingId: booking.id, 
        studentId: userId, 
        coachId: coach_id 
      });

      return ResponseUtil.success(res, {
        booking_id: booking.id,
        booking_status: booking.booking_status,
        remaining_lessons: relation.remaining_lessons - 1
      }, '预约成功');

    } catch (error) {
      logger.error('课程预约失败:', error);
      return ResponseUtil.error(res, '预约失败');
    }
  });

  /**
   * 获取课程列表
   * @route GET /api/h5/courses
   */
  static getCourseList = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      coach_id = '',
      start_date = '',
      end_date = '',
      role = 'student' // student 或 coach
    } = req.query;

    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions = {};

      // 根据角色过滤
      if (role === 'coach') {
        whereConditions.coach_id = userId;
      } else {
        whereConditions.student_id = userId;
      }

      // 状态筛选
      if (status) {
        whereConditions.booking_status = status;
      }

      // 教练筛选（只在学员视角下有效）
      if (coach_id && role === 'student') {
        whereConditions.coach_id = coach_id;
      }

      // 日期范围筛选
      if (start_date || end_date) {
        whereConditions.course_date = {};
        if (start_date) {
          whereConditions.course_date[Op.gte] = start_date;
        }
        if (end_date) {
          whereConditions.course_date[Op.lte] = end_date;
        }
      }

      const { count, rows: courses } = await CourseBooking.findAndCountAll({
        where: whereConditions,
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
        order: [['course_date', 'DESC'], ['start_time', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        courses,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: count,
          limit: parseInt(limit)
        }
      }, '获取课程列表成功');

    } catch (error) {
      logger.error('获取课程列表失败:', error);
      return ResponseUtil.error(res, '获取课程列表失败');
    }
  });

  /**
   * 获取课程详情
   * @route GET /api/h5/courses/:id
   */
  static getCourseDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;

    try {
      const course = await CourseBooking.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'gender']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'gender', 'intro']
          }
        ]
      });

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 权限检查：只有课程相关的学员或教练才能查看
      if (course.student_id !== userId && course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权查看此课程');
      }

      return ResponseUtil.success(res, course, '获取课程详情成功');

    } catch (error) {
      logger.error('获取课程详情失败:', error);
      return ResponseUtil.error(res, '获取课程详情失败');
    }
  });

  /**
   * 确认课程
   * @route PUT /api/h5/courses/:id/confirm
   */
  static confirmCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;

    try {
      const course = await CourseBooking.findByPk(id);

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 只有教练可以确认课程
      if (course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '只有教练可以确认课程');
      }

      // 只有待确认状态的课程可以确认
      if (course.booking_status !== 1) {
        return ResponseUtil.validationError(res, '课程状态不允许确认');
      }

      await course.update({
        booking_status: 2, // 已确认
        confirmed_at: new Date(),
        updated_by: userId
      });

      logger.info('课程确认成功:', { courseId: id, coachId: userId });

      return ResponseUtil.success(res, {
        booking_id: course.id,
        booking_status: course.booking_status
      }, '课程确认成功');

    } catch (error) {
      logger.error('课程确认失败:', error);
      return ResponseUtil.error(res, '课程确认失败');
    }
  });

  /**
   * 取消课程
   * @route PUT /api/h5/courses/:id/cancel
   */
  static cancelCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;
    const { cancel_reason = '' } = req.body;

    try {
      const course = await CourseBooking.findByPk(id);

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 学员和教练都可以取消课程
      if (course.student_id !== userId && course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权取消此课程');
      }

      // 已完成的课程不能取消
      if (course.booking_status === 4) {
        return ResponseUtil.validationError(res, '已完成的课程不能取消');
      }

      // 已取消的课程不能重复取消
      if (course.booking_status === 5) {
        return ResponseUtil.validationError(res, '课程已被取消');
      }

      await course.update({
        booking_status: 5, // 已取消
        cancel_reason: cancel_reason,
        cancelled_at: new Date(),
        cancelled_by: userId,
        updated_by: userId
      });

      // 如果是学员取消，需要恢复课时
      if (course.student_id === userId) {
        const relation = await StudentCoachRelation.findOne({
          where: {
            student_id: course.student_id,
            coach_id: course.coach_id
          }
        });

        if (relation) {
          await relation.increment('remaining_lessons', { by: 1 });
        }
      }

      logger.info('课程取消成功:', { 
        courseId: id, 
        cancelledBy: userId,
        reason: cancel_reason 
      });

      return ResponseUtil.success(res, {
        booking_id: course.id,
        booking_status: course.booking_status
      }, '课程取消成功');

    } catch (error) {
      logger.error('课程取消失败:', error);
      return ResponseUtil.error(res, '课程取消失败');
    }
  });

  /**
   * 完成课程
   * @route PUT /api/h5/courses/:id/complete
   */
  static completeCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;
    const { feedback = '', rating = 5 } = req.body;

    try {
      const course = await CourseBooking.findByPk(id);

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 只有教练可以标记课程完成
      if (course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '只有教练可以标记课程完成');
      }

      // 只有已确认或进行中的课程可以完成
      if (![2, 3].includes(course.booking_status)) {
        return ResponseUtil.validationError(res, '课程状态不允许完成');
      }

      await course.update({
        booking_status: 4, // 已完成
        feedback: feedback,
        rating: rating,
        completed_at: new Date(),
        updated_by: userId
      });

      logger.info('课程完成:', { courseId: id, coachId: userId });

      return ResponseUtil.success(res, {
        booking_id: course.id,
        booking_status: course.booking_status
      }, '课程已标记为完成');

    } catch (error) {
      logger.error('完成课程失败:', error);
      return ResponseUtil.error(res, '完成课程失败');
    }
  });

  /**
   * 开始课程（标记为进行中）
   * @route PUT /api/h5/courses/:id/start
   */
  static startCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;

    try {
      const course = await CourseBooking.findByPk(id);

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 只有教练可以开始课程
      if (course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '只有教练可以开始课程');
      }

      // 只有已确认的课程可以开始
      if (course.booking_status !== 2) {
        return ResponseUtil.validationError(res, '只有已确认的课程可以开始');
      }

      await course.update({
        booking_status: 3, // 进行中
        started_at: new Date(),
        updated_by: userId
      });

      logger.info('课程开始:', { courseId: id, coachId: userId });

      return ResponseUtil.success(res, {
        booking_id: course.id,
        booking_status: course.booking_status
      }, '课程已开始');

    } catch (error) {
      logger.error('开始课程失败:', error);
      return ResponseUtil.error(res, '开始课程失败');
    }
  });
}

module.exports = CourseController; 