const { User, CourseBooking, StudentCoachRelation } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

/**
 * 学员控制器
 */
class StudentController {
  /**
   * 获取学员预约记录
   * @route GET /api/h5/student/bookings
   */
  static getStudentBookings = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      start_date = '', 
      end_date = '',
      coach_id = ''
    } = req.query;

    const offset = (page - 1) * limit;

    try {
      // 构建查询条件
      const whereConditions = {
        student_id: userId
      };

      // 状态筛选
      if (status) {
        whereConditions.booking_status = status;
      }

      // 日期范围筛选
      if (start_date || end_date) {
        whereConditions.booking_date = {};
        if (start_date) {
          whereConditions.booking_date[Op.gte] = start_date;
        }
        if (end_date) {
          whereConditions.booking_date[Op.lte] = end_date;
        }
      }

      // 教练筛选
      if (coach_id) {
        whereConditions.coach_id = coach_id;
      }

      const { count, rows: bookings } = await CourseBooking.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url', 'phone']
          }
        ],
        order: [['booking_date', 'DESC'], ['start_time', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      // 统计各状态数量
      const statusCounts = await CourseBooking.findAll({
        where: { student_id: userId },
        attributes: [
          'booking_status',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['booking_status'],
        raw: true
      });

      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item.booking_status] = parseInt(item.count);
        return acc;
      }, {});

      return ResponseUtil.success(res, {
        bookings,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: count,
          limit: parseInt(limit)
        },
        status_counts: {
          pending: statusMap[1] || 0,      // 待确认
          confirmed: statusMap[2] || 0,    // 已确认
          in_progress: statusMap[3] || 0,  // 进行中
          completed: statusMap[4] || 0,    // 已完成
          cancelled: statusMap[5] || 0     // 已取消
        }
      }, '获取预约记录成功');

    } catch (error) {
      logger.error('获取学员预约记录失败:', error);
      return ResponseUtil.error(res, '获取预约记录失败');
    }
  });



  /**
   * 获取学员统计信息
   * @route GET /api/h5/student/stats
   */
  static getStudentStats = asyncHandler(async (req, res) => {
    const { userId } = req;

    try {
      const [
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalCoaches,
        remainingLessons
      ] = await Promise.all([
        // 总预约数
        CourseBooking.count({
          where: { student_id: userId }
        }),
        // 已完成课程数
        CourseBooking.count({
          where: {
            student_id: userId,
            booking_status: 4
          }
        }),
        // 已取消课程数
        CourseBooking.count({
          where: {
            student_id: userId,
            booking_status: 5
          }
        }),
        // 绑定教练数
        StudentCoachRelation.count({
          where: {
            student_id: userId,
            relation_status: 1
          }
        }),
        // 剩余课时总数
        StudentCoachRelation.sum('remaining_lessons', {
          where: {
            student_id: userId,
            relation_status: 1
          }
        })
      ]);

      // 获取本月完成课程数
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const monthlyCompleted = await CourseBooking.count({
        where: {
          student_id: userId,
          booking_status: 4,
          booking_date: {
            [Op.between]: [
              monthStart.toISOString().split('T')[0],
              monthEnd.toISOString().split('T')[0]
            ]
          }
        }
      });

      return ResponseUtil.success(res, {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        total_coaches: totalCoaches,
        remaining_lessons: remainingLessons || 0,
        monthly_completed: monthlyCompleted,
        completion_rate: totalBookings > 0 ? 
          ((completedBookings / totalBookings) * 100).toFixed(1) : '0.0'
      }, '获取学员统计信息成功');

    } catch (error) {
      logger.error('获取学员统计信息失败:', error);
      return ResponseUtil.error(res, '获取学员统计信息失败');
    }
  });
}

module.exports = StudentController; 