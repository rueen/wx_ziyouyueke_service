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
    const user = req.user;
    const uploadUtil = require('../../utils/upload');
    
    // 使用multer中间件处理文件上传
    const uploadMiddleware = uploadUtil.getImageUploadMiddleware();
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        logger.error('头像上传失败:', { 
          userId: user.id,
          error: err.message,
          timestamp: new Date().toISOString()
        });
        
        // 处理不同类型的错误
        if (err.code === 'LIMIT_FILE_SIZE') {
          return ResponseUtil.businessError(res, 4000, '文件大小超过限制，最大支持2MB');
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          return ResponseUtil.businessError(res, 4000, '一次只能上传一个文件');
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return ResponseUtil.businessError(res, 4000, '请使用file字段上传文件');
        }
        
        return ResponseUtil.businessError(res, 4000, err.message);
      }
      
      // 检查是否有文件上传
      if (!req.file) {
        return ResponseUtil.validationError(res, '请选择要上传的头像文件');
      }
      
      try {
        // 生成文件访问URL
        const fileUrl = uploadUtil.getFileUrl(req.file.filename, 'images');
        
        // 保存旧头像URL（用于删除旧文件）
        const oldAvatarUrl = user.avatar_url;
        
        // 更新用户头像
        await user.update({ avatar_url: fileUrl });
        
        // 删除旧头像文件（如果存在且是本地文件）
        if (oldAvatarUrl && oldAvatarUrl.includes('/uploads/images/')) {
          const oldFilename = oldAvatarUrl.split('/').pop();
          if (oldFilename && oldFilename !== req.file.filename) {
            uploadUtil.deleteFile(oldFilename, 'images');
            logger.info('删除旧头像文件:', { 
              userId: user.id,
              oldFilename: oldFilename,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        logger.info('头像上传成功:', {
          userId: user.id,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileUrl,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.success(res, {
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }, '头像上传成功');
        
      } catch (error) {
        logger.error('头像上传处理失败:', {
          userId: user.id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // 如果处理失败，删除已上传的文件
        if (req.file) {
          uploadUtil.deleteFile(req.file.filename, 'images');
        }
        
        return ResponseUtil.internalError(res, '头像上传处理失败');
      }
    });
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

  /**
   * 解密微信手机号
   * @route POST /api/h5/user/decrypt-phone
   */
  static decryptPhone = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const user = req.user;
    const wechatUtil = require('../../utils/wechat');

    // 参数验证
    if (!code || typeof code !== 'string') {
      return ResponseUtil.validationError(res, '微信手机号授权码不能为空');
    }

    try {
      // 调用微信接口解密手机号
      const phoneInfo = await wechatUtil.decryptPhoneNumber(code);
      
      logger.info('手机号解密成功:', { 
        userId: user.id,
        phone: phoneInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'), // 脱敏日志
        timestamp: new Date().toISOString()
      });

      // 可选：自动更新用户手机号
      if (phoneInfo.phone && phoneInfo.phone !== user.phone) {
        // 检查手机号是否已被其他用户使用
        const existingUser = await User.findOne({
          where: { 
            phone: phoneInfo.phone, 
            id: { [require('sequelize').Op.ne]: user.id } 
          }
        });
        
        if (!existingUser) {
          await user.update({ phone: phoneInfo.phone });
          logger.info('自动更新用户手机号:', { 
            userId: user.id,
            phone: phoneInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
          });
        } else {
          logger.warn('手机号已被其他用户使用，跳过自动更新:', { 
            userId: user.id,
            phone: phoneInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
          });
        }
      }

      return ResponseUtil.success(res, {
        phone: phoneInfo.phone,
        purePhoneNumber: phoneInfo.purePhoneNumber,
        countryCode: phoneInfo.countryCode
      }, '手机号解密成功');
      
    } catch (error) {
      logger.error('手机号解密失败:', { 
        userId: user.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error.name === 'WeChatError') {
        return ResponseUtil.businessError(res, 2001, error.message);
      }
      
      return ResponseUtil.internalError(res, '手机号解密失败');
    }
  });
}

module.exports = UserController; 