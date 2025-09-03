const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * JWT工具类
 */
class JWTUtil {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * 生成JWT token
   * @param {Object} payload - 载荷数据
   * @param {string} expiresIn - 过期时间
   * @returns {string} JWT token
   */
  generateToken(payload, expiresIn = null) {
    try {
      const options = {
        expiresIn: expiresIn || this.expiresIn
      };

      const token = jwt.sign(payload, this.secret, options);
      logger.debug('生成JWT token成功:', { userId: payload.userId });
      
      return token;
    } catch (error) {
      logger.error('生成JWT token失败:', error);
      throw new Error('Token生成失败');
    }
  }

  /**
   * 验证JWT token
   * @param {string} token - JWT token
   * @returns {Object} 解码后的载荷数据
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      logger.debug('验证JWT token成功:', { userId: decoded.userId });
      
      return decoded;
    } catch (error) {
      logger.error('验证JWT token失败:', error);
      throw error;
    }
  }

  /**
   * 解码JWT token（不验证签名）
   * @param {string} token - JWT token
   * @returns {Object} 解码后的载荷数据
   */
  decodeToken(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded;
    } catch (error) {
      logger.error('解码JWT token失败:', error);
      throw new Error('Token解码失败');
    }
  }

  /**
   * 检查token是否即将过期
   * @param {string} token - JWT token
   * @param {number} bufferTime - 缓冲时间（秒），默认30分钟
   * @returns {boolean} 是否即将过期
   */
  isTokenExpiringSoon(token, bufferTime = 1800) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp;
      
      return (expirationTime - currentTime) <= bufferTime;
    } catch (error) {
      return true; // 解码失败认为已过期
    }
  }

  /**
   * 刷新token
   * @param {string} token - 旧的JWT token
   * @returns {string} 新的JWT token
   */
  refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      // 移除JWT标准字段，只保留自定义载荷
      const { iat, exp, ...payload } = decoded;
      
      return this.generateToken(payload);
    } catch (error) {
      logger.error('刷新JWT token失败:', error);
      throw error;
    }
  }

  /**
   * 为用户生成标准token
   * @param {Object} user - 用户对象
   * @returns {string} JWT token
   */
  generateUserToken(user) {
    const payload = {
      userId: user.id,
      openid: user.openid,
      nickname: user.nickname
    };

    return this.generateToken(payload);
  }

  /**
   * 生成短期验证token（用于敏感操作）
   * @param {Object} payload - 载荷数据
   * @param {string} expiresIn - 过期时间，默认15分钟
   * @returns {string} JWT token
   */
  generateVerificationToken(payload, expiresIn = '15m') {
    return this.generateToken(payload, expiresIn);
  }

  /**
   * 获取token剩余时间（秒）
   * @param {string} token - JWT token
   * @returns {number} 剩余时间（秒）
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = decoded.exp;
      
      return Math.max(0, expirationTime - currentTime);
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new JWTUtil(); 