const { Op } = require('sequelize');
const User = require('../../shared/models/User');
const { sendSuccess, sendError } = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * 用户管理控制器
 */
class UserController {
  /**
   * 获取用户列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getUserList(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        keyword = '', 
        status = '', 
        start_date = '', 
        end_date = '' 
      } = req.query;

      // 构建查询条件
      const where = {};
      
      // 关键词搜索（昵称、手机号）
      if (keyword) {
        where[Op.or] = [
          { nickname: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ];
      }

      // 状态筛选
      if (status !== '') {
        where.status = parseInt(status);
      }

      // 注册时间范围筛选
      if (start_date || end_date) {
        where.register_time = {};
        if (start_date) {
          where.register_time[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.register_time[Op.lte] = new Date(end_date + ' 23:59:59');
        }
      }

      // 分页参数
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageLimit = parseInt(limit);

      // 查询用户列表
      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: [
          'id', 'nickname', 'avatar_url', 'phone', 'gender', 
          'register_time', 'last_login_time', 'status'
        ],
        order: [['register_time', 'DESC']],
        offset,
        limit: pageLimit
      });

      // 格式化数据
      const users = rows.map(user => ({
        id: user.id,
        nickname: user.nickname || '未设置',
        avatar_url: user.avatar_url,
        phone: user.phone || '未绑定',
        gender: user.gender === 1 ? '男' : user.gender === 2 ? '女' : '未知',
        register_time: user.register_time,
        last_login_time: user.last_login_time,
        status: user.status,
        status_text: user.status === 1 ? '正常' : '禁用'
      }));

      const result = {
        total: count,
        page: parseInt(page),
        limit: pageLimit,
        list: users,
      };

      sendSuccess(res, result, '获取用户列表成功');
      
    } catch (error) {
      logger.error('获取用户列表异常:', error);
      sendError(res, '获取用户列表失败', 500);
    }
  }

  /**
   * 获取用户详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getUserDetail(req, res) {
    try {
      const { id } = req.params;

      // 参数验证
      if (!id || isNaN(id)) {
        return sendError(res, '无效的用户ID', 400);
      }

      // 查找用户
      const user = await User.findByPk(id, {
        attributes: [
          'id', 'openid', 'unionid', 'nickname', 'avatar_url', 
          'phone', 'gender', 'intro', 'certification', 'motto', 
          'poster_image', 'register_time', 
          'last_login_time', 'status'
        ]
      });

      if (!user) {
        return sendError(res, '用户不存在', 404);
      }

      // 格式化用户数据
      const userDetail = {
        id: user.id,
        openid: user.openid,
        unionid: user.unionid,
        nickname: user.nickname || '未设置',
        avatar_url: user.avatar_url,
        phone: user.phone || '未绑定',
        gender: user.gender === 1 ? '男' : user.gender === 2 ? '女' : '未知',
        gender_value: user.gender,
        intro: user.intro || '暂无介绍',
        certification: user.certification || '暂无认证',
        motto: user.motto || '暂无格言',
        poster_image: user.poster_image,
        register_time: user.register_time,
        last_login_time: user.last_login_time,
        status: user.status,
        status_text: user.status === 1 ? '正常' : '禁用'
      };

      sendSuccess(res, userDetail, '获取用户详情成功');
      
    } catch (error) {
      logger.error('获取用户详情异常:', error);
      sendError(res, '获取用户详情失败', 500);
    }
  }

  /**
   * 删除用户
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const admin = req.admin;

      // 参数验证
      if (!id || isNaN(id)) {
        return sendError(res, '无效的用户ID', 400);
      }

      // 查找用户
      const user = await User.findByPk(id);
      
      if (!user) {
        return sendError(res, '用户不存在', 404);
      }

      // 删除用户
      await user.destroy();

      logger.info(`管理员 ${admin.username} 删除用户: ${user.nickname || user.phone || user.id}`);
      
      sendSuccess(res, null, '删除用户成功');
      
    } catch (error) {
      logger.error('删除用户异常:', error);
      sendError(res, '删除用户失败', 500);
    }
  }

  /**
   * 修改用户状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const admin = req.admin;

      // 参数验证
      if (!id || isNaN(id)) {
        return sendError(res, '无效的用户ID', 400);
      }

      if (status === undefined || ![0, 1].includes(parseInt(status))) {
        return sendError(res, '无效的状态值', 400);
      }

      // 查找用户
      const user = await User.findByPk(id);
      
      if (!user) {
        return sendError(res, '用户不存在', 404);
      }

      // 更新状态
      await user.update({ status: parseInt(status) });

      const statusText = parseInt(status) === 1 ? '启用' : '禁用';
      logger.info(`管理员 ${admin.username} ${statusText}用户: ${user.nickname || user.phone || user.id}`);
      
      sendSuccess(res, null, `${statusText}用户成功`);
      
    } catch (error) {
      logger.error('修改用户状态异常:', error);
      sendError(res, '修改用户状态失败', 500);
    }
  }
}

module.exports = UserController;
