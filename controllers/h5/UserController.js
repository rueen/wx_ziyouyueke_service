const { User } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 用户信息控制器
 */
class UserController {
  /**
   * 获取用户信息
   * @route GET /api/h5/user/profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const roles = await user.getRoles();

    return ResponseUtil.success(res, {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
      gender: user.gender,
      intro: user.intro,
      register_time: user.register_time,
      last_login_time: user.last_login_time,
      status: user.status,
      roles
    }, '获取用户信息成功');
  });

  /**
   * 更新用户信息
   * @route PUT /api/h5/user/profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const { nickname, phone, gender, intro } = req.body;

    // 准备更新数据
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (intro !== undefined) updateData.intro = intro;

    // 检查手机号是否已被其他用户使用
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({
        where: { phone, id: { [require('sequelize').Op.ne]: user.id } }
      });
      if (existingUser) {
        return ResponseUtil.validationError(res, '手机号已被其他用户使用');
      }
    }

    // 更新用户信息
    await user.update(updateData);
    logger.info('用户信息更新:', { userId: user.id, updateData });

    // 返回更新后的用户信息
    const roles = await user.getRoles();
    return ResponseUtil.success(res, {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
      gender: user.gender,
      intro: user.intro,
      register_time: user.register_time,
      last_login_time: user.last_login_time,
      status: user.status,
      roles
    }, '用户信息更新成功');
  });

  /**
   * 上传头像
   * @route POST /api/h5/user/avatar
   */
  static uploadAvatar = asyncHandler(async (req, res) => {
    // TODO: 实现文件上传功能
    // 这里先返回一个占位实现
    return ResponseUtil.businessError(res, 1001, '头像上传功能暂未实现', 501);
  });

  /**
   * 获取用户统计信息
   * @route GET /api/h5/user/stats
   */
  static getUserStats = asyncHandler(async (req, res) => {
    const user = req.user;
    const { StudentCoachRelation, CourseBooking } = require('../../models');

    // 获取用户角色
    const roles = await user.getRoles();
    
    const stats = {
      roles,
      coachStats: null,
      studentStats: null
    };

    // 如果是教练，获取教练统计
    if (roles.isCoach) {
      const totalStudents = await StudentCoachRelation.count({
        where: { coach_id: user.id, relation_status: 1 }
      });
      
      const totalCourses = await CourseBooking.count({
        where: { coach_id: user.id }
      });
      
      const completedCourses = await CourseBooking.count({
        where: { coach_id: user.id, booking_status: 3 }
      });

      stats.coachStats = {
        totalStudents,
        totalCourses,
        completedCourses,
        pendingCourses: await CourseBooking.count({
          where: { coach_id: user.id, booking_status: 1 }
        })
      };
    }

    // 如果是学员，获取学员统计
    if (roles.isStudent) {
      const totalCoaches = await StudentCoachRelation.count({
        where: { student_id: user.id, relation_status: 1 }
      });
      
      const totalCourses = await CourseBooking.count({
        where: { student_id: user.id }
      });
      
      const completedCourses = await CourseBooking.count({
        where: { student_id: user.id, booking_status: 3 }
      });

      const totalLessons = await StudentCoachRelation.sum('remaining_lessons', {
        where: { student_id: user.id, relation_status: 1 }
      }) || 0;

      stats.studentStats = {
        totalCoaches,
        totalCourses,
        completedCourses,
        remainingLessons: totalLessons,
        pendingCourses: await CourseBooking.count({
          where: { student_id: user.id, booking_status: [1, 2] }
        })
      };
    }

    return ResponseUtil.success(res, stats, '获取用户统计信息成功');
  });
}

module.exports = UserController; 