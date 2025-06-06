const { User, TimeTemplate, CourseBooking, StudentCoachRelation } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * 教练控制器
 */
class CoachController {
  /**
   * 获取教练列表
   * @route GET /api/h5/coach/list
   */
  static getCoachList = asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 10, 
      keyword = '', 
      gender = '', 
      sort_by = 'id',
      sort_order = 'DESC' 
    } = req.query;

    const offset = (page - 1) * limit;

    try {
      // 通过师生关系表和时间模板表查找教练ID
      const [relationCoachIds, templateCoachIds] = await Promise.all([
        // 从师生关系表获取教练ID
        StudentCoachRelation.findAll({
          attributes: ['coach_id'],
          group: ['coach_id'],
          raw: true
        }),
        // 从时间模板表获取教练ID
        TimeTemplate.findAll({
          where: { is_active: true },
          attributes: ['coach_id'],
          group: ['coach_id'],
          raw: true
        })
      ]);

      // 合并两个来源的教练ID并去重
      const allCoachIds = [
        ...relationCoachIds.map(item => item.coach_id),
        ...templateCoachIds.map(item => item.coach_id)
      ];
      const coachIdList = [...new Set(allCoachIds)];

      if (coachIdList.length === 0) {
        return ResponseUtil.success(res, {
          coaches: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_count: 0,
            limit: parseInt(limit)
          }
        }, '获取教练列表成功');
      }

      // 构建查询条件
      const whereConditions = {
        id: {
          [Op.in]: coachIdList
        }
      };

      // 关键词搜索（昵称）
      if (keyword) {
        whereConditions.nickname = {
          [Op.like]: `%${keyword}%`
        };
      }

      // 性别筛选
      if (gender) {
        whereConditions.gender = gender;
      }

      const { count, rows: coaches } = await User.findAndCountAll({
        where: whereConditions,
        attributes: [
          'id', 'nickname', 'avatar_url', 'gender', 'intro', 
          'register_time', 'last_login_time'
        ],
        order: [[sort_by, sort_order.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // 为每个教练获取额外信息
      const coachesWithStats = await Promise.all(coaches.map(async (coach) => {
        // 获取学员数量
        const studentCount = await StudentCoachRelation.count({
          where: { 
            coach_id: coach.id,
            relation_status: 1
          }
        });

        // 获取已完成课程数量
        const completedLessons = await CourseBooking.count({
          where: {
            coach_id: coach.id,
            booking_status: 4 // 已完成
          }
        });

        // 获取时间模板数量（可预约时段）
        const availableSlots = await TimeTemplate.count({
          where: {
            coach_id: coach.id,
            is_active: true
          }
        });

        return {
          ...coach.toJSON(),
          stats: {
            student_count: studentCount,
            completed_lessons: completedLessons,
            available_slots: availableSlots
          }
        };
      }));

      const totalPages = Math.ceil(count / limit);

      return ResponseUtil.success(res, {
        coaches: coachesWithStats,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: count,
          limit: parseInt(limit)
        }
      }, '获取教练列表成功');

    } catch (error) {
      logger.error('获取教练列表失败:', error);
      return ResponseUtil.error(res, '获取教练列表失败');
    }
  });

  /**
   * 获取教练详情
   * @route GET /api/h5/coach/:id
   * @description 公开接口，无需认证即可访问
   * @param {string} req.params.id - 教练ID
   */
  static getCoachDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // 验证是否为教练（通过师生关系表或时间模板表）
      const [hasRelation, hasTemplate] = await Promise.all([
        StudentCoachRelation.count({ where: { coach_id: id } }),
        TimeTemplate.count({ where: { coach_id: id, is_active: true } })
      ]);

      if (hasRelation === 0 && hasTemplate === 0) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      const coach = await User.findOne({
        where: { id: id },
        attributes: [
          'id', 'nickname', 'avatar_url', 'gender', 'intro', 
          'register_time', 'last_login_time'
          // 注意：移除了 phone 字段，保护用户隐私
        ]
      });

      if (!coach) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      // 获取教练统计信息
      const [studentCount, completedLessons, totalLessons] = await Promise.all([
        // 学员数量
        StudentCoachRelation.count({
          where: { 
            coach_id: id,
            relation_status: 1
          }
        }),
        // 已完成课程数量
        CourseBooking.count({
          where: {
            coach_id: id,
            booking_status: 4
          }
        }),
        // 总课程数量
        CourseBooking.count({
          where: {
            coach_id: id
          }
        })
      ]);

      // 获取最近5个学员评价（如果有评价表的话）
      // TODO: 后续添加评价功能时补充

      const coachDetail = {
        ...coach.toJSON(),
        stats: {
          student_count: studentCount,
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          completion_rate: totalLessons > 0 ? (completedLessons / totalLessons * 100).toFixed(1) : 0
        }
      };

      return ResponseUtil.success(res, coachDetail, '获取教练详情成功');

    } catch (error) {
      logger.error('获取教练详情失败:', error);
      return ResponseUtil.error(res, '获取教练详情失败');
    }
  });

  /**
   * 获取教练课程安排
   * @route GET /api/h5/coach/:id/schedule
   */
  static getCoachSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      start_date, 
      end_date,
      status = '' // 可选筛选状态
    } = req.query;

    try {
      // 验证教练是否存在（通过师生关系表或时间模板表）
      const [hasRelation, hasTemplate] = await Promise.all([
        StudentCoachRelation.count({ where: { coach_id: id } }),
        TimeTemplate.count({ where: { coach_id: id, is_active: true } })
      ]);

      if (hasRelation === 0 && hasTemplate === 0) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      const coach = await User.findOne({
        where: { id: id },
        attributes: ['id', 'nickname', 'avatar_url']
      });

      if (!coach) {
        return ResponseUtil.notFound(res, '教练不存在');
      }

      // 构建查询条件
      const whereConditions = {
        coach_id: id
      };

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

      // 状态筛选
      if (status) {
        whereConditions.booking_status = status;
      }

      // 获取课程安排
      const schedules = await CourseBooking.findAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ],
        order: [['course_date', 'ASC'], ['start_time', 'ASC']]
      });

      // 按日期分组
      const schedulesByDate = schedules.reduce((acc, schedule) => {
        const date = schedule.course_date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(schedule);
        return acc;
      }, {});

      // 获取时间模板（可用时段）
      const timeTemplates = await TimeTemplate.findAll({
        where: {
          coach_id: id,
          is_active: true
        },
        order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
      });

      return ResponseUtil.success(res, {
        coach: {
          id: coach.id,
          nickname: coach.nickname,
          avatar_url: coach.avatar_url
        },
        schedules: schedulesByDate,
        time_templates: timeTemplates
      }, '获取教练课程安排成功');

    } catch (error) {
      logger.error('获取教练课程安排失败:', error);
      return ResponseUtil.error(res, '获取教练课程安排失败');
    }
  });
}

module.exports = CoachController; 