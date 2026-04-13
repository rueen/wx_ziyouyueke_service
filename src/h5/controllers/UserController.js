const { User, StudentCoachRelation } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

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
          'id', 'nickname', 'avatar_url', 'phone', 'gender', 'intro', 
          'certification', 'motto', 'poster_image', 'course_categories',
          'register_time', 'last_login_time'
          // 注意：移除了 openid 等敏感字段，保护用户隐私
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

    // 查询已绑定的正式教练数量（前端用于判断是否需要引导绑定手机号）
    const coachCount = await StudentCoachRelation.count({
      where: { student_id: user.id, relation_status: 1 }
    });

    return ResponseUtil.success(res, {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
      gender: user.gender,
      intro: user.intro,
      certification: user.certification,
      motto: user.motto,
      poster_image: user.poster_image,
      register_time: user.register_time,
      last_login_time: user.last_login_time,
      status: user.status,
      is_show: user.is_show,
      coachCount
    }, '获取用户信息成功');
  });

  /**
   * 更新用户信息
   * @route PUT /api/h5/user/profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const user = req.user;
    const { nickname, phone, gender, intro, avatar_url, certification, motto, poster_image, is_show } = req.body;

    // 准备更新数据
    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (intro !== undefined) updateData.intro = intro;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (certification !== undefined) updateData.certification = certification;
    if (motto !== undefined) updateData.motto = motto;
    if (poster_image !== undefined) updateData.poster_image = poster_image;
    if (is_show !== undefined) updateData.is_show = is_show;

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
      certification: user.certification,
      motto: user.motto,
      poster_image: user.poster_image,
      register_time: user.register_time,
      last_login_time: user.last_login_time,
      status: user.status,
      is_show: user.is_show
    }, '用户信息更新成功');
  });





  /**
   * 解密微信手机号
   * @route POST /api/h5/user/decrypt-phone
   */
  static decryptPhone = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const user = req.user;
    const wechatUtil = require('../../shared/utils/wechat');

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

      // 自动更新用户手机号
      let phoneUpdated = false;
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
          phoneUpdated = true;
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
      } else if (user.phone === phoneInfo.phone) {
        // 手机号未变更，也视为已绑定，尝试激活待关系
        phoneUpdated = true;
      }

      // 激活与该手机号匹配的所有待激活师生关系
      if (phoneUpdated && phoneInfo.phone) {
        await activatePendingRelations(user.id, phoneInfo.phone);
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

/**
 * 激活与指定手机号匹配的所有待激活师生关系
 * @param {number} userId - 刚绑定手机号的用户 ID
 * @param {string} phone - 手机号
 */
async function activatePendingRelations(userId, phone) {
  const { Op } = require('sequelize');

  try {
    const pendingRelations = await StudentCoachRelation.findAll({
      where: { pending_phone: phone, relation_status: 2 }
    });

    if (pendingRelations.length === 0) return;

    for (const relation of pendingRelations) {
      // 检查该学员与教练之间是否已存在正式关系（避免唯一索引冲突）
      const existingNormal = await StudentCoachRelation.findOne({
        where: {
          student_id: userId,
          coach_id: relation.coach_id,
          relation_status: { [Op.in]: [0, 1] }
        }
      });

      if (existingNormal) {
        if (existingNormal.relation_status === 1) {
          // 已有正式关系：直接移除待激活记录即可
          await relation.destroy();
          logger.info('待激活关系已有正式关系，移除待激活记录:', {
            userId,
            coachId: relation.coach_id,
            pendingRelationId: relation.id
          });
        } else {
          // 已有已解除关系（status=0）：重新激活已有关系，移除待激活记录
          await existingNormal.update({
            relation_status: 1,
            pending_phone: null,
            bind_time: new Date()
          });
          await relation.destroy();
          logger.info('待激活关系激活已解除的旧关系:', {
            userId,
            coachId: relation.coach_id,
            existingRelationId: existingNormal.id
          });
        }
      } else {
        // 正常激活：填入 student_id，清除 pending_phone
        await relation.update({
          student_id: userId,
          pending_phone: null,
          relation_status: 1,
          bind_time: new Date()
        });
        logger.info('待激活师生关系激活成功:', {
          userId,
          coachId: relation.coach_id,
          relationId: relation.id
        });
      }
    }
  } catch (error) {
    // 激活失败不影响手机号绑定的主流程，仅记录日志
    logger.error('激活待激活师生关系失败:', { userId, phone, error: error.message });
  }
}

module.exports = UserController; 