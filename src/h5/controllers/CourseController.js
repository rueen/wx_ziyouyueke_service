const { User, CourseBooking, StudentCoachRelation, TimeTemplate, Address, StudentCardInstance, sequelize } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');
const SubscribeMessageService = require('../../shared/services/subscribeMessageService');

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
      booking_type = 1,  // 新增：1-普通课程，2-卡片课程
      card_instance_id = null,  // 新增：如果是卡片课程，需要提供卡片实例ID
      student_remark = '',
      coach_remark = ''
    } = req.body;

    try {
      // 参数验证
      if (!coach_id || !student_id || !course_date || !start_time || !end_time || !address_id) {
        return ResponseUtil.validationError(res, '缺少必要参数');
      }

      // 验证预约类型
      if (booking_type !== 1 && booking_type !== 2) {
        return ResponseUtil.validationError(res, '预约类型参数错误');
      }

      // 如果是卡片课程，必须提供卡片实例ID
      if (booking_type === 2 && !card_instance_id) {
        return ResponseUtil.validationError(res, '卡片课程必须提供卡片实例ID');
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

      // 根据预约类型进行不同的验证
      if (booking_type === 2) {
        // 卡片课程验证
        const cardInstance = await StudentCardInstance.findOne({
          where: {
            id: card_instance_id,
            student_id: student_id,
            coach_id: coach_id,
            relation_id: relation.id
          }
        });

        if (!cardInstance) {
          return ResponseUtil.notFound(res, '卡片不存在');
        }

        // 检查卡片是否可用
        const checkResult = cardInstance.checkAvailable();
        if (!checkResult.available) {
          return ResponseUtil.validationError(res, checkResult.reason);
        }

        // 检查可用课时（考虑已预约但未完成的课程占用）
        const availableLessons = await cardInstance.getAvailableLessons();
        if (availableLessons <= 0) {
          return ResponseUtil.validationError(res, '卡片可用课时不足，无法预约课程');
        }

        // 检查课程日期是否在卡片有效期内（如果卡片已开卡）
        if (cardInstance.expire_date) {
          const moment = require('moment-timezone');
          const courseDateTime = moment.tz(course_date, 'Asia/Shanghai').startOf('day');
          const expireDate = moment.tz(cardInstance.expire_date, 'Asia/Shanghai').endOf('day');
          
          if (courseDateTime.isAfter(expireDate)) {
            return ResponseUtil.validationError(res, `卡片有效期至 ${cardInstance.expire_date}，无法预约该日期的课程`);
          }
        }

      } else {
        // 普通课程验证 - 使用原有的课时检查逻辑
        // 验证课程分类是否存在
        const categories = coach.course_categories || [];
        const categoryExists = categories.some(cat => cat.id === category_id);
        if (!categoryExists) {
          return ResponseUtil.validationError(res, '课程分类不存在');
        }

        // 检查课程日期是否在课时有效期内
        const lessons = relation.lessons || [];
        const categoryLesson = lessons.find(l => l.category_id === category_id);
        if (categoryLesson && categoryLesson.expire_date) {
          const moment = require('moment-timezone');
          const expireEndTime = moment.tz(categoryLesson.expire_date, 'Asia/Shanghai').endOf('day');
          const courseDateTime = moment.tz(course_date, 'Asia/Shanghai').startOf('day');
          
          if (courseDateTime.isAfter(expireEndTime)) {
            return ResponseUtil.validationError(res, `该分类课时有效期至 ${categoryLesson.expire_date}，无法预约该日期的课程`);
          }
        }

        // 检查指定分类的可用课时（考虑已预约但未完成的课程占用）
        const availableLessons = await relation.getAvailableLessons(category_id);
        if (availableLessons <= 0) {
          return ResponseUtil.validationError(res, '该分类可用课时不足，无法预约课程');
        }
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

      // 判断是否需要自动确认
      // 条件：教练创建 && 学员开启了自动确认
      const isAutoConfirm = userId === coach_id && relation.auto_confirm_by_coach === 1;
      
      // 创建预约
      const booking = await CourseBooking.create({
        student_id: student_id,
        coach_id: coach_id,
        relation_id: relation.id,
        course_date: course_date,
        start_time: start_time,
        end_time: end_time,
        address_id: address_id,
        category_id: category_id,
        booking_type: booking_type,
        card_instance_id: booking_type === 2 ? card_instance_id : null,
        student_remark: student_remark,
        coach_remark: coach_remark,
        booking_status: isAutoConfirm ? 2 : 1, // 自动确认：2-已确认，否则：1-待确认
        confirmed_at: isAutoConfirm ? new Date() : null, // 自动确认时设置确认时间
        created_by: userId
      });

      logger.info('课程预约成功:', { 
        bookingId: booking.id, 
        studentId: student_id, 
        coachId: coach_id,
        bookingType: booking_type,
        cardInstanceId: card_instance_id,
        isAutoConfirm: isAutoConfirm,
        bookingStatus: booking.booking_status
      });

      // 异步发送订阅消息（不阻塞响应）
      setImmediate(async () => {
        try {
          if (isAutoConfirm) {
            // 自动确认的课程：只向学员发送"预约成功通知"
            const categoryName = categories.find(cat => cat.id === category_id)?.name || '默认分类';
            
            await SubscribeMessageService.sendBookingSuccessNotice({
              booking,
              coach,
              student,
              confirmerUser: coach, // 教练确认
              receiverUser: student, // 学员接收
              address,
              categoryName
            });

            logger.info('自动确认课程，已向学员发送预约成功通知', {
              bookingId: booking.id,
              studentId: student_id
            });
          } else {
            // 需要确认的课程：发送"预约确认提醒"
            const bookerUser = userId === student_id ? student : coach;
            const receiverUser = userId === student_id ? coach : student;

            await SubscribeMessageService.sendBookingConfirmNotice({
              booking,
              bookerUser,
              receiverUser,
              relation,
              address
            });
          }
        } catch (error) {
          logger.error('发送订阅消息失败:', error);
        }
      });

      return ResponseUtil.success(res, {
        booking_id: booking.id,
        booking_status: booking.booking_status,
        is_auto_confirm: isAutoConfirm
      }, isAutoConfirm ? '预约成功（已自动确认）' : '预约成功');

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
          },
          {
            model: StudentCardInstance,
            as: 'cardInstance',
            attributes: ['id', 'coach_card_id', 'total_lessons', 'remaining_lessons', 'expire_date', 'card_status', 'valid_days'],
            required: false,
            include: [
              {
                model: require('../../shared/models').CoachCard,
                as: 'coachCard',
                attributes: ['id', 'card_name', 'card_color'],
                paranoid: false // 包括软删除的卡片模板
              }
            ]
          }
        ],
        order: [['course_date', 'DESC'], ['start_time', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      // 格式化课程列表，处理卡片信息
      const formattedCourses = courses.map(course => {
        const courseData = course.toJSON();
        
        // 如果是卡片课程且有卡片信息，添加卡片名称和颜色
        if (courseData.booking_type === 2 && courseData.cardInstance) {
          courseData.card_name = courseData.cardInstance.coachCard?.card_name || '未知卡片';
          courseData.card_color = courseData.cardInstance.coachCard?.card_color || '#999999';
        }
        
        return courseData;
      });

      return ResponseUtil.success(res, {
        list: formattedCourses,
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
          },
          {
            model: StudentCardInstance,
            as: 'cardInstance',
            attributes: ['id', 'coach_card_id', 'total_lessons', 'remaining_lessons', 'expire_date', 'card_status', 'valid_days'],
            required: false,
            include: [
              {
                model: require('../../shared/models').CoachCard,
                as: 'coachCard',
                attributes: ['id', 'card_name', 'card_color'],
                paranoid: false
              }
            ]
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

      // 格式化课程数据，处理卡片信息
      const courseData = course.toJSON();
      if (courseData.booking_type === 2 && courseData.cardInstance) {
        courseData.card_name = courseData.cardInstance.coachCard?.card_name || '未知卡片';
        courseData.card_color = courseData.cardInstance.coachCard?.card_color || '#999999';
      }

      return ResponseUtil.success(res, courseData, '获取课程详情成功');

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

      const course = await CourseBooking.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'openid']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'openid', 'course_categories']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name']
          }
        ]
      });

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

      // 异步发送预约成功通知消息（不阻塞响应）
      setImmediate(async () => {
        try {
          // 获取课程分类名称
          const coach = course.coach;
          const categories = coach.course_categories || [];
          const category = categories.find(cat => cat.id === course.category_id);
          const categoryName = category ? category.name : '默认';

          // 确定确认人和接收人（接收人是创建预约的人）
          const confirmerUser = userId === course.coach_id ? course.coach : course.student;
          const receiverUser = course.created_by === course.student_id ? course.student : course.coach;

          await SubscribeMessageService.sendBookingSuccessNotice({
            booking: course,
            coach: course.coach,
            student: course.student,
            confirmerUser,
            receiverUser,
            address: course.address,
            categoryName
          });
        } catch (error) {
          logger.error('发送预约成功通知失败:', error);
        }
      });

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
      const course = await CourseBooking.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'openid']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'openid', 'course_categories']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name']
          }
        ]
      });

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

      // 异步发送课程取消通知（不阻塞响应）
      setImmediate(async () => {
        try {
          const receiverUser = userId === course.coach_id ? course.student : course.coach;

          await SubscribeMessageService.sendBookingCancelNotice({
            booking: course,
            receiverUser,
            address: course.address,
            cancelReason: cancel_reason
          });
        } catch (error) {
          logger.error('发送课程取消通知失败:', error);
        }
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

      // 根据预约类型扣除课时
      if (course.booking_type === 2 && course.card_instance_id) {
        // 卡片课程 - 从卡片中扣除
        const cardInstance = await StudentCardInstance.findByPk(course.card_instance_id, { transaction: t });
        
        if (!cardInstance) {
          await t.rollback();
          return ResponseUtil.notFound(res, '卡片不存在');
        }

        try {
          await cardInstance.deductLesson(t);
          logger.info('卡片课时扣除:', {
            cardInstanceId: cardInstance.id,
            courseId: id,
            remainingLessons: cardInstance.remaining_lessons,
            usedCount: cardInstance.used_count
          });
        } catch (error) {
          await t.rollback();
          logger.error('扣除卡片课时失败:', {
            cardInstanceId: cardInstance.id,
            courseId: id,
            error: error.message
          });
          return ResponseUtil.error(res, error.message || '扣除卡片课时失败');
        }
      } else if (course.booking_type === 1 && course.relation_id) {
        // 普通课程 - 从分类课时中扣除（原有逻辑）
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