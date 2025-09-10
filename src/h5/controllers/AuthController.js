const { User, StudentCoachRelation, TimeTemplate } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const wechatUtil = require('../../shared/utils/wechat');
const jwtUtil = require('../../shared/utils/jwt');
const logger = require('../../shared/utils/logger');

// 默认头像URL
const DEFAULT_AVATAR_URL = 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png';

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 用户注册/登录
   * @route POST /api/h5/auth/login
   */
  static login = asyncHandler(async (req, res) => {
    const { code, userInfo, coach_id } = req.body;

    // 参数验证
    if (!code || typeof code !== 'string') {
      return ResponseUtil.validationError(res, '缺少微信授权码或格式不正确');
    }

    // 获取微信用户信息
    const wechatUserInfo = await wechatUtil.getOpenIdByCode(code);
    const { openid, unionid } = wechatUserInfo;

    // 查找或创建用户
    let user = await User.findOne({ where: { openid } });
    let isNewUser = false;

    if (!user) {
      // 创建新用户 - 使用微信基础信息进行初始化
      user = await User.create({
        openid,
        unionid,
        nickname: userInfo?.nickname || null,
        avatar_url: userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
        gender: userInfo?.gender || null,
        register_time: new Date(),
        last_login_time: new Date()
      });
      isNewUser = true;
      logger.info('新用户注册:', { userId: user.id, openid, avatarUrl: user.avatar_url });

      // 为新用户创建默认时间模板
      try {
        const defaultTimeSlots = [
          { startTime: "09:00", endTime: "10:00" },
          { startTime: "14:00", endTime: "15:00" },
          { startTime: "19:00", endTime: "20:00" }
        ];

        const defaultDateSlots = [
          { id: 0, text: '周日', checked: true },
          { id: 1, text: '周一', checked: true },
          { id: 2, text: '周二', checked: true },
          { id: 3, text: '周三', checked: true },
          { id: 4, text: '周四', checked: true },
          { id: 5, text: '周五', checked: true },
          { id: 6, text: '周六', checked: true }
        ];

        const timeTemplate = await TimeTemplate.create({
          coach_id: user.id,
          min_advance_days: 1,
          max_advance_days: 7,
          max_advance_nums: 1,
          time_slots: defaultTimeSlots,
          date_slots: defaultDateSlots,
          is_active: 1
        });

        logger.info('为新用户创建默认时间模板:', { 
          userId: user.id, 
          templateId: timeTemplate.id,
          timeSlots: defaultTimeSlots 
        });
      } catch (error) {
        logger.error('创建默认时间模板失败:', { userId: user.id, error: error.message });
        // 不阻断用户注册流程
      }
    } else {
      // 老用户登录 - 只更新登录时间，不覆盖已设置的个人信息
      await user.updateLastLoginTime();
      
      // 只有在用户没有设置头像时，才设置默认头像
      if (!user.avatar_url) {
        await user.update({ avatar_url: DEFAULT_AVATAR_URL });
        logger.info('为老用户设置默认头像:', { userId: user.id, openid });
      }
      
      // 重新从数据库获取最新的用户信息，确保返回的数据是最新的
      await user.reload();
      
      logger.info('用户登录:', { userId: user.id, openid });
    }

    // 自动绑定教练关系
    let autoBindCoach = false;
    if (coach_id && isNewUser) {
      try {
        const coach = await User.findByPk(coach_id);
        if (coach) {
          // 检查是否已存在关系
          const existingRelation = await StudentCoachRelation.findOne({
            where: { student_id: user.id, coach_id: coach_id }
          });

          if (!existingRelation) {
            await StudentCoachRelation.create({
              student_id: user.id,
              coach_id: coach_id,
              remaining_lessons: 0,
              relation_status: 1
            });
            autoBindCoach = true;
            logger.info('自动绑定师生关系:', { studentId: user.id, coachId: coach_id });
          }
        }
      } catch (error) {
        logger.warn('自动绑定教练失败:', error);
        // 不阻断登录流程
      }
    }

    // 生成JWT token
    const token = jwtUtil.generateUserToken(user);

    return ResponseUtil.success(res, {
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
        gender: user.gender,
        intro: user.intro,
        register_time: user.register_time,
        last_login_time: user.last_login_time
      },
      isNewUser,
      autoBindCoach
    }, '登录成功');
  });

  /**
   * 用户登出
   * @route POST /api/h5/auth/logout
   */
  static logout = asyncHandler(async (req, res) => {
    // JWT是无状态的，登出主要是客户端删除token
    // 这里可以记录登出日志
    logger.info('用户登出:', { userId: req.userId });

    return ResponseUtil.success(res, null, '登出成功');
  });

  /**
   * 刷新token
   * @route POST /api/h5/auth/refresh
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return ResponseUtil.validationError(res, 'Token不能为空');
    }

    try {
      const newToken = jwtUtil.refreshToken(token);
      return ResponseUtil.success(res, { token: newToken }, 'Token刷新成功');
    } catch (error) {
      return ResponseUtil.unauthorized(res, 'Token无效或已过期');
    }
  });

  /**
   * 验证token有效性
   * @route GET /api/h5/auth/verify
   */
  static verifyToken = asyncHandler(async (req, res) => {
    // 如果能到达这里，说明token有效（通过了认证中间件）
    const user = req.user;

    return ResponseUtil.success(res, {
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone,
        gender: user.gender,
        intro: user.intro
      }
    }, 'Token有效');
  });
}

module.exports = AuthController; 