const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * JWT认证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        code: 1002,
        message: '用户未登录'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查询用户信息
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 1005,
        message: '用户不存在'
      });
    }
    
    // 检查用户状态
    if (user.status !== 1) {
      return res.status(401).json({
        success: false,
        code: 1003,
        message: '用户已被禁用'
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = user;
    req.userId = user.id;
    req.openid = user.openid;
    
    next();
  } catch (error) {
    logger.error('Token验证失败:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 2002,
        message: 'Token已过期'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        code: 2002,
        message: 'Token无效'
      });
    }
    
    return res.status(500).json({
      success: false,
      code: 5002,
      message: '系统内部错误'
    });
  }
};

/**
 * 可选认证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.status === 1) {
        req.user = user;
        req.userId = user.id;
        req.openid = user.openid;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证中间件不抛出错误，继续执行
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
}; 