const { StudentCoachRelation, User } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 师生关系控制器
 */
class RelationController {
  /**
   * 获取师生关系列表
   * @route GET /api/h5/relations
   */
  static getRelations = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const offset = ResponseUtil.getOffset(page, limit);

    // 构建查询条件
    const whereCondition = {
      [Op.or]: [
        { student_id: userId },
        { coach_id: userId }
      ]
    };

    if (status !== undefined) {
      whereCondition.relation_status = status;
    }

    const { count, rows: relations } = await StudentCoachRelation.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        },
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const pagination = ResponseUtil.createPagination(page, limit, count);
    return ResponseUtil.successWithPagination(res, relations, pagination, '获取师生关系列表成功');
  });

  /**
   * 绑定师生关系
   * @route POST /api/h5/relations
   * @description 自动使用当前登录用户作为学员，绑定与指定教练的师生关系
   */
  static bindRelation = asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;
    const { coach_id, remaining_lessons = 0, student_remark } = req.body;

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
        await existingRelation.update({
          relation_status: 1,
          remaining_lessons,
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

    // 创建新的师生关系
    const relation = await StudentCoachRelation.create({
      student_id: finalStudentId,
      coach_id: finalCoachId,
      remaining_lessons,
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
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro']
        }
      ]
    });

    return ResponseUtil.success(res, relationWithUsers, '师生关系绑定成功');
  });

  /**
   * 获取单个师生关系详情
   * @route GET /api/h5/relations/:id
   */
  static getRelation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const relation = await StudentCoachRelation.findOne({
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
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        },
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro']
        }
      ]
    });

    if (!relation) {
      return ResponseUtil.notFound(res, '师生关系不存在或无权限查看');
    }

    return ResponseUtil.success(res, relation, '获取师生关系详情成功');
  });

  /**
   * 更新师生关系备注
   * @route PUT /api/h5/relations/:id
   */
  static updateRelation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { coach_remark, student_remark, remaining_lessons } = req.body;

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
      // 教练可以更新教练备注和剩余课时
      if (coach_remark !== undefined) updateData.coach_remark = coach_remark;
      if (remaining_lessons !== undefined) updateData.remaining_lessons = remaining_lessons;
    }

    if (relation.student_id === userId) {
      // 学员可以更新学员备注
      if (student_remark !== undefined) updateData.student_remark = student_remark;
    }

    if (Object.keys(updateData).length === 0) {
      return ResponseUtil.validationError(res, '没有可更新的字段');
    }

    await relation.update(updateData);
    logger.info('师生关系更新:', { relationId: id, userId, updateData });

    return ResponseUtil.success(res, relation, '师生关系更新成功');
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
            attributes: ['id', 'nickname', 'avatar_url', 'phone', 'intro', 'gender']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      // 为每个教练关系添加课程统计信息
      const { CourseBooking } = require('../../shared/models');
      const coachesWithStats = await Promise.all(relations.map(async (relation) => {
        const coachId = relation.coach_id;

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

        return {
          ...relation.toJSON(),
          lesson_stats: {
            total_lessons: totalLessons,
            completed_lessons: completedLessons,
            upcoming_lessons: upcomingLessons,
            remaining_lessons: relation.remaining_lessons || 0
          }
        };
      }));

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        list: coachesWithStats,
        total: count,
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

    const { count, rows: relations } = await StudentCoachRelation.findAndCountAll({
      where: {
        coach_id: coachId,
        relation_status: 1
      },
      attributes: [
        'id', 'student_id', 'coach_id', 'remaining_lessons', 
        'student_remark', 'coach_remark', 'relation_status', 
        'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    const totalPages = Math.ceil(count / limit);

    return ResponseUtil.success(res, {
      list: relations,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(limit),
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: count,
        limit: parseInt(limit)
      }
    }, '获取我的学员列表成功');
  });
}

module.exports = RelationController; 