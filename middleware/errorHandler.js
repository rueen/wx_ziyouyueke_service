const logger = require('../utils/logger');
const { OperationLog } = require('../models');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error('Global Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user ? { id: req.user.id, openid: req.user.openid } : null
  });

  // 记录错误操作日志
  if (req.user) {
    OperationLog.log({
      userId: req.user.id,
      operationType: 'ERROR',
      operationDesc: `API错误: ${err.message}`,
      tableName: null,
      recordId: null,
      oldData: null,
      newData: {
        error: err.message,
        url: req.url,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }).catch(logErr => {
      logger.error('记录错误日志失败:', logErr);
    });
  }

  // Sequelize 数据库错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '数据验证失败',
      errors: err.errors.map(error => ({
        field: error.path,
        message: error.message,
        value: error.value
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '数据重复',
      error: '该数据已存在'
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '关联数据不存在'
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      code: 5001,
      message: '数据库操作失败'
    });
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 2002,
      message: 'Token无效'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 2002,
      message: 'Token已过期'
    });
  }

  // 自定义业务错误
  if (err.name === 'BusinessError') {
    return res.status(err.status || 400).json({
      success: false,
      code: err.code || 1001,
      message: err.message
    });
  }

  // 微信API错误
  if (err.name === 'WeChatError') {
    return res.status(400).json({
      success: false,
      code: 2001,
      message: '微信接口调用失败'
    });
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '文件大小超出限制'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '文件数量超出限制'
    });
  }

  // SyntaxError (JSON解析错误)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: 'JSON格式错误'
    });
  }

  // 默认错误处理
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? '系统内部错误' : err.message;
  const code = status === 500 ? 5002 : 1001;

  res.status(status).json({
    success: false,
    code,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 自定义业务错误类
 */
class BusinessError extends Error {
  constructor(message, code = 1001, status = 400) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 微信API错误类
 */
class WeChatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WeChatError';
  }
}

/**
 * 异步错误包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  BusinessError,
  WeChatError,
  asyncHandler
}; 