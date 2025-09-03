const jwt = require('jsonwebtoken');
const Waiter = require('../models/Waiter');
const { sendError } = require('../utils/response');

/**
 * 管理员身份验证中间件
 */
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return sendError(res, '未提供访问令牌', 401);
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查是否为管理员类型的token
    if (decoded.type !== 'admin') {
      return sendError(res, '无效的访问令牌', 401);
    }

    // 查找管理员
    const waiter = await Waiter.findByPk(decoded.id);
    
    if (!waiter) {
      return sendError(res, '管理员不存在', 401);
    }

    if (waiter.status !== 1) {
      return sendError(res, '管理员账号已被禁用', 401);
    }

    // 将管理员信息添加到请求对象
    req.admin = waiter;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, '无效的访问令牌', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, '访问令牌已过期', 401);
    }
    return sendError(res, '身份验证失败', 401);
  }
};

module.exports = adminAuth;
