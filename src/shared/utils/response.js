/**
 * 统一响应格式工具类
 */
class ResponseUtil {
  /**
   * 成功响应
   * @param {Object} res - Express response对象
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {number} code - 业务状态码
   */
  static success(res, data = null, message = '操作成功', code = 200) {
    return res.status(200).json({
      success: true,
      code,
      message,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 分页成功响应
   * @param {Object} res - Express response对象
   * @param {Array} list - 数据列表
   * @param {Object} pagination - 分页信息
   * @param {string} message - 响应消息
   */
  static successWithPagination(res, list, pagination, message = '查询成功') {
    return res.status(200).json({
      success: true,
      code: 200,
      message,
      data: {
        list,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.limit)
        }
      },
      timestamp: Date.now()
    });
  }

  /**
   * 错误响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   * @param {number} code - 业务状态码
   * @param {number} httpStatus - HTTP状态码
   * @param {*} error - 详细错误信息
   */
  static error(res, message = '操作失败', code = 400, httpStatus = 400, error = null) {
    const response = {
      success: false,
      code,
      message,
      timestamp: Date.now()
    };

    if (error) {
      response.error = error;
    }

    return res.status(httpStatus).json(response);
  }

  /**
   * 参数错误响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   * @param {Array} errors - 详细错误列表
   */
  static validationError(res, message = '参数错误', errors = []) {
    return res.status(400).json({
      success: false,
      code: 1001,
      message,
      errors,
      timestamp: Date.now()
    });
  }

  /**
   * 未授权响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   */
  static unauthorized(res, message = '用户未登录') {
    return res.status(401).json({
      success: false,
      code: 1002,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 禁止访问响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   */
  static forbidden(res, message = '权限不足') {
    return res.status(403).json({
      success: false,
      code: 1003,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 资源不存在响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   */
  static notFound(res, message = '资源不存在') {
    return res.status(404).json({
      success: false,
      code: 1004,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 服务器错误响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   */
  static serverError(res, message = '系统内部错误') {
    return res.status(500).json({
      success: false,
      code: 5002,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 请求过于频繁响应
   * @param {Object} res - Express response对象
   * @param {string} message - 错误消息
   */
  static tooManyRequests(res, message = '请求过于频繁，请稍后再试') {
    return res.status(429).json({
      success: false,
      code: 429,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 自定义业务错误响应
   * @param {Object} res - Express response对象
   * @param {number} code - 业务状态码
   * @param {string} message - 错误消息
   * @param {number} httpStatus - HTTP状态码
   */
  static businessError(res, code, message, httpStatus = 400) {
    return res.status(httpStatus).json({
      success: false,
      code,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * 创建分页参数
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @param {number} total - 总数量
   * @returns {Object} 分页信息
   */
  static createPagination(page, limit, total) {
    return {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      total: parseInt(total) || 0
    };
  }

  /**
   * 计算分页偏移量
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {number} 偏移量
   */
  static getOffset(page, limit) {
    return (parseInt(page) - 1) * parseInt(limit);
  }
}

// 导出便利方法
const sendSuccess = ResponseUtil.success;
const sendError = ResponseUtil.error;

module.exports = ResponseUtil;
module.exports.sendSuccess = sendSuccess;
module.exports.sendError = sendError; 