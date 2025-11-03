const { StudentCoachRelation, User } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

/**
 * 师生关系控制器
 */
class RelationController {
  /**
   * 绑定师生关系
   * @route POST /api/h5/relations
   * @description 自动使用当前登录用户作为学员，绑定与指定教练的师生关系
   */
  static bindRelation = asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const { coach_id, student_remark } = req.body;

    // 直接使用当前登录用户作为学员ID
    const finalStudentId = currentUserId;
    const finalCoachId = coach_id;

    // 验证教练和学员不能是同一人
    if (finalStudentId === finalCoachId) {
      return ResponseUtil.validationError(res, '教练和学员不能是同一人');
    }

    // 验证教练和学员用户存在
    const coach = await User.findByPk(finalCoachId);
    const student = await User.findByPk(finalStudentId);

    if (!coach) {
      return ResponseUtil.notFound(res, '教练不存在');
    }
    if (!student) {
      return ResponseUtil.notFound(res, '学员不存在');
    }

    // 检查是否已存在关系
    const existingRelation = await StudentCoachRelation.findOne({
      where: {
        student_id: finalStudentId,
        coach_id: finalCoachId
      }
    });

    if (existingRelation) {
      if (existingRelation.relation_status === 1) {
        return ResponseUtil.validationError(res, '师生关系已存在');
      } else {
        // 如果关系存在但已禁用，重新启用
        // 获取教练的课程分类，更新分类课时
        const categories = coach.course_categories || [];
        
        // 构建按分类的课时结构，保留现有课时并添加新分类
        let lessons = existingRelation.lessons || [];
        
        // 为新增的分类添加课时项
        for (const category of categories) {
          if (!lessons.some(lesson => lesson.category_id === category.id)) {
            lessons.push({
              category_id: category.id,
              remaining_lessons: 0
            });
          }
        }

        await existingRelation.update({
          relation_status: 1,
          lessons: lessons,
          student_name: existingRelation.student_name || student.nickname, // 如果没有student_name则使用nickname
          student_remark: student_remark || existingRelation.student_remark
        });
        
        logger.info('师生关系重新启用:', { 
          studentId: finalStudentId, 
          coachId: finalCoachId,
          relationId: existingRelation.id 
        });

        return ResponseUtil.success(res, existingRelation, '师生关系绑定成功');
      }
    }

    // 获取教练的课程分类，初始化分类课时
    const categories = coach.course_categories || [];
    
    // 构建按分类的课时结构
    const lessons = categories.map(category => ({
      category_id: category.id,
      remaining_lessons: 0 // 所有分类初始课时为0
    }));

    // 创建新的师生关系
    const relation = await StudentCoachRelation.create({
      student_id: finalStudentId,
      coach_id: finalCoachId,
      student_name: student.nickname, // 默认使用学员的nickname
      lessons: lessons,
      student_remark,
      relation_status: 1
    });

    logger.info('师生关系创建:', { 
      studentId: finalStudentId, 
      coachId: finalCoachId,
      relationId: relation.id 
    });

    // 返回包含用户信息的关系数据
    const relationWithUsers = await StudentCoachRelation.findByPk(relation.id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        },
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'certification', 'motto', 'poster_image']
        }
      ]
    });

    return ResponseUtil.success(res, relationWithUsers, '师生关系绑定成功');
  });


  /**
   * 更新师生关系
   * @route PUT /api/h5/relations/:id
   */
  static updateRelation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { coach_remark, student_remark, category_lessons, remaining_lessons, student_name } = req.body;

    try {
      const relation = await StudentCoachRelation.findOne({
        where: {
          id,
          [Op.or]: [
            { student_id: userId },
            { coach_id: userId }
          ]
        }
      });

      if (!relation) {
        return ResponseUtil.notFound(res, '师生关系不存在或无权限修改');
      }

      const updateData = {};

      // 根据用户角色确定可以更新的字段
      if (relation.coach_id === userId) {
        // 教练可以更新教练备注、学员姓名和分类课时
        if (coach_remark !== undefined) updateData.coach_remark = coach_remark;
        if (student_name !== undefined) updateData.student_name = student_name;
        
        // 处理分类课时更新
        if (category_lessons && Array.isArray(category_lessons)) {
          // 验证分类课时数据格式
          for (const lesson of category_lessons) {
            if (typeof lesson.category_id !== 'number' || typeof lesson.remaining_lessons !== 'number' || lesson.remaining_lessons < 0) {
              return ResponseUtil.validationError(res, '分类课时数据格式错误');
            }
            
            // 验证 expire_date 格式
            if (lesson.expire_date && !moment(lesson.expire_date, 'YYYY-MM-DD', true).isValid()) {
              return ResponseUtil.validationError(res, '日期格式错误，应为 YYYY-MM-DD');
            }
            
            // 初始化新字段
            if (lesson.is_cleared === undefined) {
              lesson.is_cleared = false;
            }
            if (lesson.original_lessons === undefined) {
              lesson.original_lessons = null; // 只在清零时记录
            }
            if (lesson.expire_date === undefined) {
              lesson.expire_date = null;
            }
          }

          // 获取教练的分类信息，验证分类是否存在
          const coach = await User.findByPk(relation.coach_id);
          const categories = coach.course_categories || [];
          
          for (const lesson of category_lessons) {
            const categoryExists = categories.some(cat => cat.id === lesson.category_id);
            if (!categoryExists) {
              return ResponseUtil.validationError(res, `分类ID ${lesson.category_id} 不存在`);
            }
          }

          // 使用特殊的更新方法确保JSON字段正确保存
          relation.lessons = category_lessons;
          relation.changed('lessons', true);
          updateData.lessons = category_lessons;
        } else if (remaining_lessons !== undefined && typeof remaining_lessons === 'number' && remaining_lessons >= 0) {
          // 兼容处理：将 remaining_lessons 组装成默认分类格式
          const compatibleLessons = [{
            category_id: 0,
            remaining_lessons: remaining_lessons
          }];

          // 使用特殊的更新方法确保JSON字段正确保存
          relation.lessons = compatibleLessons;
          relation.changed('lessons', true);
          updateData.lessons = compatibleLessons;
        }
      }

      if (relation.student_id === userId) {
        // 学员可以更新学员备注
        if (student_remark !== undefined) updateData.student_remark = student_remark;
      }

      if (Object.keys(updateData).length === 0) {
        return ResponseUtil.validationError(res, '没有可更新的字段');
      }

      // 如果包含lessons字段更新，使用save方法确保JSON字段正确保存
      if (updateData.lessons) {
        // 设置其他字段
        for (const [key, value] of Object.entries(updateData)) {
          if (key !== 'lessons') {
            relation[key] = value;
          }
        }
        await relation.save();
      } else {
        // 没有lessons字段更新，使用普通update方法
        await relation.update(updateData);
      }
      
      logger.info('师生关系更新:', { relationId: id, userId, updateData });

      return ResponseUtil.success(res, relation, '师生关系更新成功');
    } catch (error) {
      logger.error('更新师生关系失败:', { relationId: id, userId, error: error.message });
      return ResponseUtil.serverError(res, '更新师生关系失败');
    }
  });

  /**
   * 解除师生关系
   * @route DELETE /api/h5/relations/:id
   */
  static removeRelation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const relation = await StudentCoachRelation.findOne({
      where: {
        id,
        [Op.or]: [
          { student_id: userId },
          { coach_id: userId }
        ]
      }
    });

    if (!relation) {
      return ResponseUtil.notFound(res, '师生关系不存在或无权限操作');
    }

    // 检查是否有未完成的课程
    const { CourseBooking } = require('../../shared/models');
    const pendingCourses = await CourseBooking.count({
      where: {
        relation_id: id,
        booking_status: [1, 2] // 待确认或已确认
      }
    });

    if (pendingCourses > 0) {
      return ResponseUtil.validationError(res, '存在未完成的课程，无法解除师生关系');
    }

    // 软删除：设置状态为禁用
    await relation.update({ relation_status: 0 });
    logger.info('师生关系解除:', { relationId: id, userId });

    return ResponseUtil.success(res, null, '师生关系解除成功');
  });

  /**
   * 获取我的教练列表（学员视角）
   * @route GET /api/h5/relations/my-coaches
   * @description 获取当前学员绑定的所有教练，包含课程统计信息
   */
  static getMyCoaches = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { count, rows: relations } = await StudentCoachRelation.findAndCountAll({
        where: {
          student_id: studentId,
          relation_status: 1
        },
        include: [
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'certification', 'motto', 'poster_image', 'gender', 'course_categories']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // 为每个教练关系添加课程统计信息和分类课时信息
      const { CourseBooking } = require('../../shared/models');
      const coachesWithStats = await Promise.all(relations.map(async (relation) => {
        const coachId = relation.coach_id;

        // 获取教练的分类信息
        const coach = relation.coach;
        const categories = coach.course_categories || [];

        // 获取与该教练的课程统计
        const [totalLessons, completedLessons, upcomingLessons] = await Promise.all([
          // 总课程数
          CourseBooking.count({
            where: {
              student_id: studentId,
              coach_id: coachId
            }
          }),
          // 已完成课程数
          CourseBooking.count({
            where: {
              student_id: studentId,
              coach_id: coachId,
              booking_status: 3
            }
          }),
          // 未来课程数（待确认、已确认）
          CourseBooking.count({
            where: {
              student_id: studentId,
              coach_id: coachId,
              booking_status: {
                [Op.in]: [1, 2]
              },
              course_date: {
                [Op.gte]: new Date().toISOString().split('T')[0]
              }
            }
          })
        ]);

        // 获取学员与教练的课时信息（触发过期检查）
        const lessons = relation.getAllCategoryLessons();
        
        // 整合分类和课时信息，并检查过期状态
        const categoryLessons = await Promise.all(categories.map(async (category) => {
          const categoryLesson = lessons.find(lesson => lesson.category_id === category.id);
          // 调用 getCategoryLessons 触发过期检查
          const remaining = categoryLesson ? await relation.getCategoryLessons(category.id) : 0;
          
          // 计算 is_expired
          let is_expired = false;
          if (categoryLesson && categoryLesson.expire_date) {
            const expireEndTime = moment.tz(categoryLesson.expire_date, 'Asia/Shanghai').endOf('day');
            const now = moment.tz('Asia/Shanghai');
            is_expired = now.isAfter(expireEndTime);
          }
          
          return {
            category: category,
            remaining_lessons: remaining,
            expire_date: categoryLesson ? categoryLesson.expire_date : null,
            is_expired: is_expired
          };
        }));

        // 计算总课时数（向后兼容）
        const totalRemainingLessons = lessons.reduce((total, lesson) => {
          return total + (lesson.remaining_lessons || 0);
        }, 0);

        return {
          ...relation.toJSON(),
          category_lessons: categoryLessons,
          remaining_lessons: totalRemainingLessons, // 兼容字段：总课时数
          lesson_stats: {
            total_lessons: totalLessons,
            completed_lessons: completedLessons,
            upcoming_lessons: upcomingLessons
          }
        };
      }));

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        list: coachesWithStats,
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
      }, '获取我的教练列表成功');

    } catch (error) {
      logger.error('获取我的教练列表失败:', error);
      return ResponseUtil.error(res, '获取我的教练列表失败');
    }
  });

  /**
   * 获取我的学员列表（教练视角）
   * @route GET /api/h5/relations/my-students
   */
  static getMyStudents = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const { count, rows: relations } = await StudentCoachRelation.findAndCountAll({
        where: {
          coach_id: coachId,
          relation_status: 1
        },
        attributes: [
          'id', 'student_id', 'coach_id', 'student_name', 'lessons',
          'student_remark', 'coach_remark', 'relation_status', 
          'booking_status', 'booking_closed_at', 'booking_reopened_at',
          'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'certification', 'motto', 'poster_image']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // 获取教练的分类信息
      const coach = await User.findByPk(coachId, {
        attributes: ['id', 'course_categories']
      });
      const categories = coach.course_categories || [];

      // 为每个学员关系添加分类课时信息（触发过期检查）
      const studentsWithCategoryLessons = await Promise.all(relations.map(async (relation) => {
        const lessons = relation.getAllCategoryLessons();
        
        // 整合分类和课时信息，并检查过期状态
        const categoryLessons = await Promise.all(categories.map(async (category) => {
          const categoryLesson = lessons.find(lesson => lesson.category_id === category.id);
          // 调用 getCategoryLessons 触发过期检查
          const remaining = categoryLesson ? await relation.getCategoryLessons(category.id) : 0;
          
          // 计算 is_expired
          let is_expired = false;
          if (categoryLesson && categoryLesson.expire_date) {
            const expireEndTime = moment.tz(categoryLesson.expire_date, 'Asia/Shanghai').endOf('day');
            const now = moment.tz('Asia/Shanghai');
            is_expired = now.isAfter(expireEndTime);
          }
          
          return {
            category: category,
            remaining_lessons: remaining,
            expire_date: categoryLesson ? categoryLesson.expire_date : null,
            is_expired: is_expired
          };
        }));

        // 计算总课时数（向后兼容）
        const totalRemainingLessons = categoryLessons.reduce((total, item) => {
          return total + (item.remaining_lessons || 0);
        }, 0);

        return {
          ...relation.toJSON(),
          category_lessons: categoryLessons,
          remaining_lessons: totalRemainingLessons
        };
      }));

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        list: studentsWithCategoryLessons,
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
      }, '获取我的学员列表成功');
    } catch (error) {
      logger.error('获取我的学员列表失败:', { coachId, error: error.message });
      return ResponseUtil.serverError(res, '获取我的学员列表失败');
    }
  });

  /**
   * 获取我的教练详情（学员视角）
   * @route GET /api/h5/relations/my-coaches/:id
   * @description 获取指定教练的详情信息，包含课程统计和分类课时信息
   */
  static getMyCoachDetail = asyncHandler(async (req, res) => {
    const studentId = req.user.id;
    const relationId = req.params.id;

    try {
      const relation = await StudentCoachRelation.findOne({
        where: {
          id: relationId,
          student_id: studentId,
          relation_status: 1
        },
        include: [
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'certification', 'motto', 'poster_image', 'gender', 'course_categories']
          }
        ]
      });

      if (!relation) {
        return ResponseUtil.notFound(res, '师生关系不存在');
      }

      const coachId = relation.coach_id;
      
      // 获取教练的分类信息
      const coach = relation.coach;
      const categories = coach.course_categories || [];

      // 获取与该教练的课程统计
      const { CourseBooking } = require('../../shared/models');
      const [totalLessons, completedLessons, upcomingLessons] = await Promise.all([
        // 总课程数
        CourseBooking.count({
          where: {
            student_id: studentId,
            coach_id: coachId
          }
        }),
        // 已完成课程数
        CourseBooking.count({
          where: {
            student_id: studentId,
            coach_id: coachId,
            booking_status: 3
          }
        }),
        // 未来课程数（待确认、已确认）
        CourseBooking.count({
          where: {
            student_id: studentId,
            coach_id: coachId,
            booking_status: {
              [Op.in]: [1, 2]
            },
            course_date: {
              [Op.gte]: new Date().toISOString().split('T')[0]
            }
          }
        })
      ]);

      // 获取学员与教练的课时信息（触发过期检查）
      const lessons = relation.getAllCategoryLessons();
      
      // 整合分类和课时信息，并检查过期状态
      const categoryLessons = await Promise.all(categories.map(async (category) => {
        const categoryLesson = lessons.find(lesson => lesson.category_id === category.id);
        // 调用 getCategoryLessons 触发过期检查
        const remaining = categoryLesson ? await relation.getCategoryLessons(category.id) : 0;
        
        // 计算 is_expired
        let is_expired = false;
        if (categoryLesson && categoryLesson.expire_date) {
          const expireEndTime = moment.tz(categoryLesson.expire_date, 'Asia/Shanghai').endOf('day');
          const now = moment.tz('Asia/Shanghai');
          is_expired = now.isAfter(expireEndTime);
        }
        
        return {
          category: category,
          remaining_lessons: remaining,
          expire_date: categoryLesson ? categoryLesson.expire_date : null,
          is_expired: is_expired
        };
      }));

      // 计算总课时数（向后兼容）
      const totalRemainingLessons = categoryLessons.reduce((total, item) => {
        return total + (item.remaining_lessons || 0);
      }, 0);

      const coachDetail = {
        ...relation.toJSON(),
        category_lessons: categoryLessons,
        remaining_lessons: totalRemainingLessons, // 兼容字段：总课时数
        lesson_stats: {
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          upcoming_lessons: upcomingLessons
        }
      };

      return ResponseUtil.success(res, coachDetail, '获取教练详情成功');

    } catch (error) {
      logger.error('获取教练详情失败:', error);
      return ResponseUtil.error(res, '获取教练详情失败');
    }
  });

  /**
   * 获取我的学员详情（教练视角）
   * @route GET /api/h5/relations/my-students/:id
   * @description 获取指定学员的详情信息，包含分类课时信息
   */
  static getMyStudentDetail = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const relationId = req.params.id;

    try {
      const relation = await StudentCoachRelation.findOne({
        where: {
          id: relationId,
          coach_id: coachId,
          relation_status: 1
        },
        attributes: [
          'id', 'student_id', 'coach_id', 'student_name', 'lessons',
          'student_remark', 'coach_remark', 'relation_status', 
          'booking_status', 'booking_closed_at', 'booking_reopened_at',
          'createdAt', 'updatedAt'
        ],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'certification', 'motto', 'poster_image']
          }
        ]
      });

      if (!relation) {
        return ResponseUtil.notFound(res, '师生关系不存在');
      }

      // 获取教练的分类信息
      const coach = await User.findByPk(coachId, {
        attributes: ['id', 'course_categories']
      });
      const categories = coach.course_categories || [];

      // 获取学员的课时信息（触发过期检查）
      const lessons = relation.getAllCategoryLessons();
      
      // 整合分类和课时信息，并检查过期状态
      const categoryLessons = await Promise.all(categories.map(async (category) => {
        const categoryLesson = lessons.find(lesson => lesson.category_id === category.id);
        // 调用 getCategoryLessons 触发过期检查
        const remaining = categoryLesson ? await relation.getCategoryLessons(category.id) : 0;
        
        // 计算 is_expired
        let is_expired = false;
        if (categoryLesson && categoryLesson.expire_date) {
          const expireEndTime = moment.tz(categoryLesson.expire_date, 'Asia/Shanghai').endOf('day');
          const now = moment.tz('Asia/Shanghai');
          is_expired = now.isAfter(expireEndTime);
        }
        
        return {
          category: category,
          remaining_lessons: remaining,
          expire_date: categoryLesson ? categoryLesson.expire_date : null,
          is_expired: is_expired
        };
      }));

      // 计算总课时数（向后兼容）
      const totalRemainingLessons = categoryLessons.reduce((total, item) => {
        return total + (item.remaining_lessons || 0);
      }, 0);

      const studentDetail = {
        ...relation.toJSON(),
        category_lessons: categoryLessons,
        remaining_lessons: totalRemainingLessons
      };

      return ResponseUtil.success(res, studentDetail, '获取学员详情成功');

    } catch (error) {
      logger.error('获取学员详情失败:', error);
      return ResponseUtil.error(res, '获取学员详情失败');
    }
  });

  /**
   * 切换约课状态
   * @route PUT /api/h5/relations/:id/booking-status
   * @description 开启或关闭师生关系的约课状态
   */
  static toggleBookingStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { booking_status } = req.body;

    try {
      // 参数验证
      if (booking_status !== 0 && booking_status !== 1) {
        return ResponseUtil.validationError(res, '约课状态参数错误，必须为 0 或 1');
      }

      // 查找师生关系（学员和教练都可以操作）
      const relation = await StudentCoachRelation.findOne({
        where: {
          id,
          [Op.or]: [
            { student_id: userId },
            { coach_id: userId }
          ],
          relation_status: 1
        }
      });

      if (!relation) {
        return ResponseUtil.notFound(res, '师生关系不存在或无权限操作');
      }

      // 如果状态相同，无需操作
      if (relation.booking_status === booking_status) {
        return ResponseUtil.success(res, relation, '约课状态未变更');
      }

      let message = '';

      // 关闭约课
      if (booking_status === 0) {
        await relation.closeBooking();
        message = '约课状态已关闭';
        logger.info('约课状态关闭:', { 
          relationId: id, 
          userId, 
          studentId: relation.student_id,
          coachId: relation.coach_id
        });
      } 
      // 开启约课
      else {
        await relation.reopenBooking();
        message = '约课状态已开启';
        logger.info('约课状态开启:', { 
          relationId: id, 
          userId,
          studentId: relation.student_id,
          coachId: relation.coach_id
        });
      }

      // 重新加载关系数据
      await relation.reload();

      return ResponseUtil.success(res, {
        id: relation.id,
        booking_status: relation.booking_status,
        booking_closed_at: relation.booking_closed_at,
        booking_reopened_at: relation.booking_reopened_at
      }, message);

    } catch (error) {
      logger.error('切换约课状态失败:', { relationId: id, userId, error: error.message });
      return ResponseUtil.serverError(res, '切换约课状态失败');
    }
  });

}

module.exports = RelationController; 