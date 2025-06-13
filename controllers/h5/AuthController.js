const { User, StudentCoachRelation } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const wechatUtil = require('../../utils/wechat');
const jwtUtil = require('../../utils/jwt');
const logger = require('../../utils/logger');

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
      // 创建新用户
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
    } else {
      // 更新最后登录时间
      await user.updateLastLoginTime();
      
      // 更新用户信息（如果提供）
      const updateData = {};
      if (userInfo) {
        if (userInfo.nickname) updateData.nickname = userInfo.nickname;
        if (userInfo.avatarUrl) updateData.avatar_url = userInfo.avatarUrl;
        if (userInfo.gender !== undefined) updateData.gender = userInfo.gender;
      }
      
      // 如果用户没有头像，设置默认头像
      if (!user.avatar_url) {
        updateData.avatar_url = DEFAULT_AVATAR_URL;
        logger.info('为老用户设置默认头像:', { userId: user.id, openid });
      }
      
      if (Object.keys(updateData).length > 0) {
        await user.update(updateData);
      }
      
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