const jwt = require('jsonwebtoken');
const Waiter = require('../../shared/models/Waiter');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * 管理员认证控制器
 */
class AuthController {
  /**
   * 管理员登录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // 参数验证
      if (!username || !password) {
        return sendError(res, '用户名和密码不能为空', 400);
      }

      // 查找管理员
      const waiter = await Waiter.findOne({
        where: { username }
      });

      if (!waiter) {
        logger.warn(`管理员登录失败 - 用户名不存在: ${username}`);
        return sendError(res, '用户名或密码错误', 401);
      }

      // 检查账号状态
      if (waiter.status !== 1) {
        logger.warn(`管理员登录失败 - 账号已禁用: ${username}`);
        return sendError(res, '账号已被禁用', 401);
      }

      // 验证密码
      const isValidPassword = await waiter.validatePassword(password);
      if (!isValidPassword) {
        logger.warn(`管理员登录失败 - 密码错误: ${username}`);
        return sendError(res, '用户名或密码错误', 401);
      }

      // 生成 JWT token
      const token = jwt.sign(
        { 
          id: waiter.id, 
          username: waiter.username,
          type: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // 更新最后登录时间
      await waiter.updateLastLoginTime();

      logger.info(`管理员登录成功: ${username}`);

      sendSuccess(res, {
        token,
        admin: {
          id: waiter.id,
          username: waiter.username,
          real_name: waiter.real_name,
          email: waiter.email,
          last_login_time: waiter.last_login_time
        }
      }, '登录成功');

    } catch (error) {
      logger.error('管理员登录异常:', error);
      sendError(res, '登录失败，请稍后重试', 500);
    }
  }

  /**
   * 管理员退出登录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async logout(req, res) {
    try {
      const admin = req.admin;
      
      logger.info(`管理员退出登录: ${admin.username}`);
      
      sendSuccess(res, null, '退出登录成功');
    } catch (error) {
      logger.error('管理员退出登录异常:', error);
      sendError(res, '退出登录失败', 500);
    }
  }

  /**
   * 获取管理员信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getProfile(req, res) {
    try {
      const admin = req.admin;
      
      sendSuccess(res, {
        id: admin.id,
        username: admin.username,
        real_name: admin.real_name,
        email: admin.email,
        last_login_time: admin.last_login_time,
        status: admin.status
      }, '获取管理员信息成功');
      
    } catch (error) {
      logger.error('获取管理员信息异常:', error);
      sendError(res, '获取管理员信息失败', 500);
    }
  }
}

module.exports = AuthController;
