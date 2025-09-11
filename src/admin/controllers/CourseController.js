const { Op } = require('sequelize');
const CourseBooking = require('../../shared/models/CourseBooking');
const User = require('../../shared/models/User');
const Address = require('../../shared/models/Address');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * 课程管理控制器
 */
class CourseController {
  /**
   * 获取课程列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getCourseList(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        keyword = '', 
        status = '', 
        start_date = '', 
        end_date = '',
        student_id = '',
        coach_id = ''
      } = req.query;

      // 构建查询条件
      const where = {};
      
      // 状态筛选
      if (status !== '') {
        where.booking_status = parseInt(status);
      }

      // 课程日期范围筛选
      if (start_date || end_date) {
        where.course_date = {};
        if (start_date) {
          where.course_date[Op.gte] = start_date;
        }
        if (end_date) {
          where.course_date[Op.lte] = end_date;
        }
      }

      // 分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageLimit = parseInt(limit);

      // 构建关联查询条件
      const include = [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'phone', 'avatar_url'],
          where: (() => {
            const studentWhere = {};
            
            // 关键词搜索（姓名或电话）
            if (keyword) {
              studentWhere[Op.or] = [
                { nickname: { [Op.like]: `%${keyword}%` } },
                { phone: { [Op.like]: `%${keyword}%` } }
              ];
            }
            
            // 学员ID筛选
            if (student_id) {
              studentWhere.id = parseInt(student_id);
            }
            
            return Object.keys(studentWhere).length > 0 ? studentWhere : undefined;
          })(),
          required: !!(keyword || student_id)
        },
        {
          model: User,
          as: 'coach',
          attributes: ['id', 'nickname', 'phone', 'avatar_url'],
          where: coach_id ? { id: parseInt(coach_id) } : undefined,
          required: !!coach_id
        },
        {
          model: Address,
          as: 'address',
          attributes: ['id', 'name', 'address']
        }
      ];

      // 查询课程列表
      const { count, rows } = await CourseBooking.findAndCountAll({
        where,
        include,
        order: [['createdAt', 'DESC']],
        offset,
        limit: pageLimit
      });

      // 格式化数据
      const courses = rows.map(course => ({
        id: course.id,
        student: {
          id: course.student?.id,
          nickname: course.student?.nickname || '未设置',
          phone: course.student?.phone || '未绑定',
          avatar_url: course.student?.avatar_url
        },
        coach: {
          id: course.coach?.id,
          nickname: course.coach?.nickname || '未设置',
          phone: course.coach?.phone || '未绑定',
          avatar_url: course.coach?.avatar_url
        },
        course_date: course.course_date,
        start_time: course.start_time,
        end_time: course.end_time,
        booking_status: course.booking_status,
        status_text: course.getStatusText(),
        address: {
          id: course.address?.id,
          name: course.address?.name,
          detailed_address: course.address?.address
        },
        student_remark: course.student_remark,
        coach_remark: course.coach_remark,
        confirmed_at: course.confirmed_at,
        cancelled_at: course.cancelled_at,
        cancel_reason: course.cancel_reason,
        complete_at: course.complete_at,
        created_at: course.createdAt
      }));

      const result = {
        list: courses,
        total: count,
        page: parseInt(page),
        pageSize: pageLimit,
      };

      sendSuccess(res, result, '获取课程列表成功');
      
    } catch (error) {
      logger.error('获取课程列表异常:', error);
      sendError(res, '获取课程列表失败', 500);
    }
  }

  /**
   * 获取课程详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getCourseDetail(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      if (!id || isNaN(id)) {
        return sendError(res, '无效的课程ID', 400);
      }

      // 查找课程
      const course = await CourseBooking.findByPk(id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'phone', 'avatar_url', 'gender']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'phone', 'avatar_url', 'gender']
          },
          {
            model: Address,
            as: 'address',
            attributes: ['id', 'name', 'address', 'latitude', 'longitude']
          }
        ]
      });

      if (!course) {
        return sendError(res, '课程不存在', 404);
      }

      // 格式化课程数据
      const courseDetail = {
        id: course.id,
        student: {
          id: course.student?.id,
          nickname: course.student?.nickname || '未设置',
          phone: course.student?.phone || '未绑定',
          avatar_url: course.student?.avatar_url,
          gender: course.student?.gender === 1 ? '男' : course.student?.gender === 2 ? '女' : '未知'
        },
        coach: {
          id: course.coach?.id,
          nickname: course.coach?.nickname || '未设置',
          phone: course.coach?.phone || '未绑定',
          avatar_url: course.coach?.avatar_url,
          gender: course.coach?.gender === 1 ? '男' : course.coach?.gender === 2 ? '女' : '未知'
        },
        course_date: course.course_date,
        start_time: course.start_time,
        end_time: course.end_time,
        booking_status: course.booking_status,
        status_text: course.getStatusText(),
        address: {
          id: course.address?.id,
          name: course.address?.name,
          detailed_address: course.address?.address,
          latitude: course.address?.latitude,
          longitude: course.address?.longitude
        },
        student_remark: course.student_remark,
        coach_remark: course.coach_remark,
        confirmed_at: course.confirmed_at,
        cancelled_at: course.cancelled_at,
        cancelled_by: course.cancelled_by,
        cancel_reason: course.cancel_reason,
        complete_at: course.complete_at,
        created_at: course.createdAt,
        updated_at: course.updatedAt
      };

      sendSuccess(res, courseDetail, '获取课程详情成功');
      
    } catch (error) {
      logger.error('获取课程详情异常:', error);
      sendError(res, '获取课程详情失败', 500);
    }
  }

  /**
   * 删除课程
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      const admin = req.admin;

      // 参数验证
      if (!id || isNaN(id)) {
        return sendError(res, '无效的课程ID', 400);
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
        return sendError(res, '课程不存在', 404);
      }

      // 删除课程
      await course.destroy();

      logger.info(`管理员 ${admin.username} 删除课程: ID ${course.id}, 学员: ${course.student?.nickname || course.student?.phone}, 教练: ${course.coach?.nickname || course.coach?.phone}`);
      
      sendSuccess(res, null, '删除课程成功');
      
    } catch (error) {
      logger.error('删除课程异常:', error);
      sendError(res, '删除课程失败', 500);
    }
  }

  /**
   * 获取课程统计数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getCourseStats(req, res) {
    try {
      // 获取各状态课程数量
      const stats = await CourseBooking.findAll({
        attributes: [
          'booking_status',
          [CourseBooking.sequelize.fn('COUNT', CourseBooking.sequelize.col('id')), 'count']
        ],
        group: ['booking_status']
      });

      // 格式化统计数据
      const statusMap = {
        1: '待确认',
        2: '已确认',
        3: '已完成',
        4: '已取消',
        5: '超时取消'
      };

      const result = {
        total: 0,
        by_status: {}
      };

      stats.forEach(stat => {
        const status = stat.booking_status;
        const count = parseInt(stat.dataValues.count);
        result.total += count;
        result.by_status[status] = {
          count,
          name: statusMap[status] || '未知状态'
        };
      });

      // 确保所有状态都有数据
      Object.keys(statusMap).forEach(status => {
        if (!result.by_status[status]) {
          result.by_status[status] = {
            count: 0,
            name: statusMap[status]
          };
        }
      });

      sendSuccess(res, result, '获取课程统计成功');
      
    } catch (error) {
      logger.error('获取课程统计异常:', error);
      sendError(res, '获取课程统计失败', 500);
    }
  }
}

module.exports = CourseController;
