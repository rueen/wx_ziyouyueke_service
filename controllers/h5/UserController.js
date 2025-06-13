const { User } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 用户信息控制器
 */
class UserController {
  /**
   * 获取用户详情
   * @route GET /api/h5/user/:id
   * @description 公开接口，无需认证，返回用户基本信息
   */
  static getUserDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // 查找用户
      const user = await User.findOne({
        where: { id: id },
        attributes: [
          'id', 'nickname', 'avatar_url', 'gender', 'intro', 
          'register_time', 'last_login_time'
          // 注意：移除了 openid, phone 等敏感字段，保护用户隐私
        ]
      });

      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      return ResponseUtil.success(res, user.toJSON(), '获取用户详情成功');

    } catch (error) {
      logger.error('获取用户详情失败:', error);
      return ResponseUtil.serverError(res, '获取用户详情失败');
    }
  });

  /**
   * 获取用户信息
   * @route GET /api/h5/user/profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    // 重新从数据库获取最新的用户信息，避免返回缓存数据
    const user = await User.findByPk(req.userId);
    
    if (!user) {
      return ResponseUtil.notFound(res, '用户不存在');
    }

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
      status: user.status
    }, '获取用户信息成功');
  });

  /**
   * 更新用户信息
   * @route PUT /api/h5/user/profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const { nickname, phone, gender, intro, avatar_url } = req.body;

    // 准备更新数据
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (intro !== undefined) updateData.intro = intro;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

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
      status: user.status
    }, '用户信息更新成功');
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
      
      return ResponseUtil.serverError(res, '手机号解密失败');
    }
  });
}

module.exports = UserController; 