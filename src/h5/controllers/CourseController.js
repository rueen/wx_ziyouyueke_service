const { User, CourseBooking, StudentCoachRelation, TimeTemplate, Address, sequelize } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
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
      category_id = 0,
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

      // 验证课程分类是否存在
      const categories = coach.course_categories || [];
      const categoryExists = categories.some(cat => cat.id === category_id);
      if (!categoryExists) {
        return ResponseUtil.validationError(res, '课程分类不存在');
      }

      // 验证师生关系并检查课时余额
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
      } else {
        // 如果没有提供relation_id，尝试查找师生关系
        relation = await StudentCoachRelation.findOne({
          where: {
            student_id: student_id,
            coach_id: coach_id,
            relation_status: 1
          }
        });

        if (!relation) {
          return ResponseUtil.validationError(res, '学员与教练之间没有有效的师生关系');
        }
      }

      // 检查约课状态
      if (relation.booking_status === 0) {
        return ResponseUtil.validationError(res, '该师生关系已关闭约课，无法预约');
      }

      // 检查指定分类的可用课时（考虑已预约但未完成的课程占用）
      const availableLessons = await relation.getAvailableLessons(category_id);
      if (availableLessons <= 0) {
        return ResponseUtil.validationError(res, '该分类可用课时不足，无法预约课程');
      }

      // 检查教练时间段人数限制
      const activeTemplate = await TimeTemplate.getActiveByCoachId(coach_id);
      if (activeTemplate) {
        // 查询同一教练、同一日期、同一时间段的已确认预约数量
        const existingBookings = await CourseBooking.count({
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

        // 检查是否超过人数限制
        if (existingBookings >= activeTemplate.max_advance_nums) {
          return ResponseUtil.validationError(res, '该时间段预约人数已满');
        }
      } else {
        // 如果教练没有活跃的时间模板，使用默认限制（1人）
        const existingBookings = await CourseBooking.count({
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

        // 默认限制为1人
        if (existingBookings >= 1) {
          return ResponseUtil.validationError(res, '该时间段预约人数已满');
        }
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
        category_id: category_id,
        student_remark: student_remark,
        coach_remark: coach_remark,
        booking_status: 1, // 待确认
        created_by: userId
      });

      logger.info('课程预约成功:', { 
        bookingId: booking.id, 
        studentId: student_id, 
        coachId: coach_id 
      });

      return ResponseUtil.success(res, {
        booking_id: booking.id,
        booking_status: booking.booking_status
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
      // 自动取消超时课程
      await CourseBooking.autoTimeoutCancel();

      // 构建查询条件
      const whereConditions = {};

      // 学员ID筛选
      if (student_id) {
        whereConditions.student_id = student_id;
      }

      // 教练ID筛选
      if (coach_id) {
        whereConditions.coach_id = coach_id;
      }

      // 状态筛选
      if (status) {
        if (status === '4') {
          // 当状态为4时，筛选所有已取消的课程（包含手动取消4和超时取消5）
          whereConditions.booking_status = {
            [Op.in]: [4, 5]
          };
        } else {
          whereConditions.booking_status = status;
        }
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
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'course_categories']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name', 'address', 'latitude', 'longitude']
          },
          {
            model: StudentCoachRelation,
            as: 'relation',
            attributes: ['id', 'student_name'],
            required: false
          }
        ],
        order: [['course_date', 'DESC'], ['start_time', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        list: courses,
        total: count,
        totalPages: totalPages,
        page: parseInt(page),
        pageSize: parseInt(limit),
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
      // 自动取消超时课程
      await CourseBooking.autoTimeoutCancel();

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
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'gender', 'intro', 'certification', 'motto', 'poster_image', 'course_categories']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name', 'address', 'latitude', 'longitude']
          },
          {
            model: StudentCoachRelation,
            as: 'relation',
            attributes: ['id', 'student_name'],
            required: false
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
      // 自动取消超时课程
      await CourseBooking.autoTimeoutCancel();

      const course = await CourseBooking.findByPk(id);

      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 自己创建的课程不可以自己确认
      if (course.created_by === userId) {
        return ResponseUtil.forbidden(res, '不能确认自己创建的课程');
      }

      // 只有课程相关的学员或教练可以确认课程
      if (course.student_id !== userId && course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权确认此课程');
      }

      // 只有待确认状态的课程可以确认
      if (course.booking_status !== 1) {
        return ResponseUtil.validationError(res, '课程状态不允许确认');
      }

      await course.update({
        booking_status: 2, // 已确认
        confirmed_at: new Date()
      });

      logger.info('课程确认成功:', { courseId: id, userId });

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
      if (course.booking_status === 4 || course.booking_status === 5) {
        return ResponseUtil.validationError(res, '课程已被取消');
      }

      await course.update({
        booking_status: 4, // 已取消
        cancel_reason: cancel_reason,
        cancelled_at: new Date(),
        cancelled_by: userId
      });


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
    const { feedback = '' } = req.body;
    
    const t = await sequelize.transaction();

    try {
      const course = await CourseBooking.findByPk(id, { transaction: t });

      if (!course) {
        await t.rollback();
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 只有教练可以标记课程完成
      if (course.coach_id !== userId) {
        await t.rollback();
        return ResponseUtil.forbidden(res, '只有教练可以标记课程完成');
      }

      // 只有已确认的课程可以完成
      if (course.booking_status !== 2) {
        await t.rollback();
        return ResponseUtil.validationError(res, '课程状态不允许完成');
      }

      // 如果有师生关系，先检查并扣除课时
      if (course.relation_id) {
        const relation = await StudentCoachRelation.findByPk(course.relation_id, { transaction: t });
        if (relation) {
          // 确定要扣除课时的分类ID（兼容处理）
          const targetCategoryId = course.category_id !== null && course.category_id !== undefined 
            ? course.category_id 
            : 0;

          try {
            // 从指定分类中扣除课时（会自动检查过期）
            const categoryLessons = await relation.getCategoryLessons(targetCategoryId);
            if (categoryLessons > 0) {
              await relation.decreaseCategoryLessons(targetCategoryId, 1, t);
              logger.info('课时消耗（按分类）:', { 
                relationId: course.relation_id, 
                courseId: id,
                categoryId: targetCategoryId,
                remainingLessons: categoryLessons - 1
              });
            } else {
              await t.rollback();
              return ResponseUtil.validationError(res, '该分类课时不足或已过期');
            }
          } catch (error) {
            await t.rollback();
            logger.error('扣除课时失败:', {
              relationId: course.relation_id,
              courseId: id,
              categoryId: targetCategoryId,
              error: error.message
            });
            return ResponseUtil.error(res, error.message || '扣除课时失败');
          }
        }
      }

      // 更新课程状态为完成
      await course.update({
        booking_status: 3, // 已完成
        complete_at: new Date(),
        coach_remark: feedback
      }, { transaction: t });

      await t.commit();

      logger.info('课程完成:', { courseId: id, coachId: userId });

      return ResponseUtil.success(res, {
        booking_id: course.id,
        booking_status: course.booking_status
      }, '课程已标记为完成');

    } catch (error) {
      await t.rollback();
      logger.error('完成课程失败:', error);
      return ResponseUtil.error(res, '完成课程失败');
    }
  });

  /**
   * 删除课程
   * @route DELETE /api/h5/courses/:id
   */
  static deleteCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId } = req;

    try {
      // 参数验证
      if (!id || isNaN(id)) {
        return ResponseUtil.validationError(res, '无效的课程ID');
      }

      // 查找课程
      const course = await CourseBooking.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['nickname', 'phone']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['nickname', 'phone']
          }
        ]
      });
      
      if (!course) {
        return ResponseUtil.notFound(res, '课程不存在');
      }

      // 权限检查：只有课程相关的学员或教练可以删除课程
      if (course.student_id !== userId && course.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权删除此课程');
      }

      // 已完成的课程不能删除
      if (course.booking_status === 3) {
        return ResponseUtil.validationError(res, '已完成的课程不能删除');
      }

      // 删除课程
      await course.destroy();

      logger.info(`用户 ${userId} 删除课程: ID ${course.id}, 学员: ${course.student?.nickname || course.student?.phone}, 教练: ${course.coach?.nickname || course.coach?.phone}`);
      
      return ResponseUtil.success(res, null, '删除课程成功');
      
    } catch (error) {
      logger.error('删除课程异常:', error);
      return ResponseUtil.error(res, '删除课程失败');
    }
  });


}

module.exports = CourseController; 