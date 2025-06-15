const { User, CourseBooking, StudentCoachRelation, TimeTemplate, Address } = require('../../models');
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
      student_id,
      relation_id,
      course_date, 
      start_time, 
      end_time, 
      address_id,
      student_remark = '',
      coach_remark = ''
    } = req.body;

    try {
      // 参数验证
      if (!coach_id || !student_id || !course_date || !start_time || !end_time || !address_id) {
        return ResponseUtil.validationError(res, '缺少必要参数');
      }

      // 验证教练是否存在
      const coach = await User.findByPk(coach_id);
      if (!coach) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      // 验证学员是否存在
      const student = await User.findByPk(student_id);
      if (!student) {
        return ResponseUtil.notFound(res, '学员不存在');
      }

      // 验证地址是否存在
      const address = await Address.findByPk(address_id);
      if (!address) {
        return ResponseUtil.notFound(res, '地址不存在');
      }

      // 如果提供了师生关系ID，验证师生关系
      let relation = null;
      if (relation_id) {
        relation = await StudentCoachRelation.findOne({
          where: {
            id: relation_id,
            student_id: student_id,
            coach_id: coach_id,
            relation_status: 1
          }
        });

        if (!relation) {
          return ResponseUtil.forbidden(res, '师生关系不存在或已禁用');
        }

        // 检查剩余课时
        if (relation.remaining_lessons <= 0) {
          return ResponseUtil.validationError(res, '剩余课时不足');
        }
      }

      // 检查教练时间冲突
      const coachConflict = await CourseBooking.findOne({
        where: {
          coach_id: coach_id,
          course_date: course_date,
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
            [Op.in]: [1, 2] // 待确认、已确认
          }
        }
      });

      if (coachConflict) {
        return ResponseUtil.validationError(res, '教练在该时间段已有其他预约');
      }

      // 检查学员时间冲突
      const studentConflict = await CourseBooking.findOne({
        where: {
          student_id: student_id,
          course_date: course_date,
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
            [Op.in]: [1, 2]
          }
        }
      });

      if (studentConflict) {
        return ResponseUtil.validationError(res, '学员在该时间段已有其他预约');
      }

      // 创建预约
      const booking = await CourseBooking.create({
        student_id: student_id,
        coach_id: coach_id,
        relation_id: relation_id,
        course_date: course_date,
        start_time: start_time,
        end_time: end_time,
        address_id: address_id,
        student_remark: student_remark,
        coach_remark: coach_remark,
        booking_status: 1, // 待确认
        created_by: userId
      });

      // 如果有师生关系，更新剩余课时
      if (relation) {
        await relation.decrement('remaining_lessons', { by: 1 });
      }

      logger.info('课程预约成功:', { 
        bookingId: booking.id, 
        studentId: student_id, 
        coachId: coach_id 
      });

      return ResponseUtil.success(res, {
        booking_id: booking.id,
        booking_status: booking.booking_status,
        remaining_lessons: relation ? relation.remaining_lessons - 1 : null
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
      student_id = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions = {};

      // 学员ID筛选
      if (student_id) {
        whereConditions.student_id = student_id;
      } else {
        // 如果没有指定学员ID，默认返回当前用户相关的课程（学员或教练）
        whereConditions[Op.or] = [
          { student_id: userId },
          { coach_id: userId }
        ];
      }

      // 教练ID筛选
      if (coach_id) {
        whereConditions.coach_id = coach_id;
      }

      // 状态筛选
      if (status) {
        whereConditions.booking_status = status;
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
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name', 'address', 'latitude', 'longitude']
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
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name', 'address', 'latitude', 'longitude']
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
        confirmed_at: new Date()
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
      if (course.booking_status === 3) {
        return ResponseUtil.validationError(res, '已完成的课程不能取消');
      }

      // 已取消的课程不能重复取消
      if (course.booking_status === 4) {
        return ResponseUtil.validationError(res, '课程已被取消');
      }

      await course.update({
        booking_status: 4, // 已取消
        cancel_reason: cancel_reason,
        cancelled_at: new Date(),
        cancelled_by: userId
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

      // 只有已确认的课程可以完成
      if (course.booking_status !== 2) {
        return ResponseUtil.validationError(res, '课程状态不允许完成');
      }

      await course.update({
        booking_status: 3, // 已完成
        complete_at: new Date(),
        coach_remark: feedback
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


}

module.exports = CourseController; 