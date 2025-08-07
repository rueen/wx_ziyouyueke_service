/**
 * 时区工具类
 * 支持多时区时间处理
 */
class TimezoneUtil {
  /**
   * 获取指定时区的偏移量（分钟）
   * @param {string} timezone - 时区标识
   * @returns {number} 偏移量（分钟）
   */
  static getTimezoneOffsetMinutes(timezone) {
    const timezoneOffsets = {
      'Asia/Shanghai': 8 * 60,      // UTC+8
      'Asia/Tokyo': 9 * 60,         // UTC+9
      'Asia/Hong_Kong': 8 * 60,     // UTC+8
      'Asia/Singapore': 8 * 60,     // UTC+8
      'America/New_York': -5 * 60,  // UTC-5 (EST) / UTC-4 (EDT)
      'America/Los_Angeles': -8 * 60, // UTC-8 (PST) / UTC-7 (PDT)
      'Europe/London': 0 * 60,      // UTC+0 (GMT) / UTC+1 (BST)
      'Europe/Paris': 1 * 60,       // UTC+1 (CET) / UTC+2 (CEST)
      'Australia/Sydney': 10 * 60,  // UTC+10 (AEST) / UTC+11 (AEDT)
      'UTC': 0                      // UTC+0
    };
    
    return timezoneOffsets[timezone] || (8 * 60); // 默认使用中国时区
  }

  /**
   * 将 UTC 时间转换为指定时区的时间
   * @param {Date|string} utcDate - UTC 时间
   * @param {string} timezone - 目标时区
   * @returns {Date} 转换后的时间
   */
  static convertToTimezone(utcDate, timezone = 'Asia/Shanghai') {
    const date = new Date(utcDate);
    const offsetMinutes = this.getTimezoneOffsetMinutes(timezone);
    return new Date(date.getTime() + (offsetMinutes * 60000));
  }

  /**
   * 将指定时区的时间转换为 UTC 时间
   * @param {Date|string} localDate - 本地时间
   * @param {string} timezone - 源时区
   * @returns {Date} UTC 时间
   */
  static convertToUTC(localDate, timezone = 'Asia/Shanghai') {
    const date = new Date(localDate);
    const offsetMinutes = this.getTimezoneOffsetMinutes(timezone);
    return new Date(date.getTime() - (offsetMinutes * 60000));
  }

  /**
   * 获取当前时间在指定时区的日期字符串 (YYYY-MM-DD)
   * @param {string} timezone - 时区标识
   * @returns {string} 日期字符串
   */
  static getCurrentDate(timezone = 'Asia/Shanghai') {
    const currentDate = new Date();
    const convertedDate = this.convertToTimezone(currentDate, timezone);
    const year = convertedDate.getFullYear();
    const month = String(convertedDate.getMonth() + 1).padStart(2, '0');
    const day = String(convertedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取当前时间在指定时区的时间字符串 (HH:mm:ss)
   * @param {string} timezone - 时区标识
   * @returns {string} 时间字符串
   */
  static getCurrentTime(timezone = 'Asia/Shanghai') {
    const currentDate = new Date();
    const convertedDate = this.convertToTimezone(currentDate, timezone);
    const hours = String(convertedDate.getHours()).padStart(2, '0');
    const minutes = String(convertedDate.getMinutes()).padStart(2, '0');
    const seconds = String(convertedDate.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * 格式化时间为指定时区的字符串
   * @param {Date|string} date - 时间
   * @param {string} timezone - 时区标识
   * @param {string} format - 格式 ('date', 'time', 'datetime')
   * @returns {string} 格式化后的时间字符串
   */
  static formatTime(date, timezone = 'Asia/Shanghai', format = 'datetime') {
    const convertedDate = this.convertToTimezone(date, timezone);
    
    switch (format) {
      case 'date': {
        const year = convertedDate.getFullYear();
        const month = String(convertedDate.getMonth() + 1).padStart(2, '0');
        const day = String(convertedDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      case 'time': {
        const hours = String(convertedDate.getHours()).padStart(2, '0');
        const minutes = String(convertedDate.getMinutes()).padStart(2, '0');
        const seconds = String(convertedDate.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      }
      case 'datetime': {
        const year = convertedDate.getFullYear();
        const month = String(convertedDate.getMonth() + 1).padStart(2, '0');
        const day = String(convertedDate.getDate()).padStart(2, '0');
        const hours = String(convertedDate.getHours()).padStart(2, '0');
        const minutes = String(convertedDate.getMinutes()).padStart(2, '0');
        const seconds = String(convertedDate.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      default:
        return convertedDate.toISOString();
    }
  }

  /**
   * 检查时间是否已过期（基于指定时区）
   * @param {string} courseDate - 课程日期 (YYYY-MM-DD)
   * @param {string} startTime - 开始时间 (HH:mm)
   * @param {string} timezone - 时区标识
   * @returns {boolean} 是否已过期
   */
  static isTimeExpired(courseDate, startTime, timezone = 'Asia/Shanghai') {
    const currentDate = this.getCurrentDate(timezone);
    const currentTime = this.getCurrentTime(timezone);
    
    // 如果课程日期小于今天，已过期
    if (courseDate < currentDate) {
      return true;
    }
    
    // 如果课程日期等于今天且开始时间小于当前时间，已过期
    if (courseDate === currentDate && startTime < currentTime) {
      return true;
    }
    
    return false;
  }

  /**
   * 从请求头中获取用户时区
   * @param {Object} req - Express 请求对象
   * @returns {string} 时区标识
   */
  static getTimezoneFromRequest(req) {
    // 优先从请求头获取
    const timezone = req.headers['x-timezone'] || req.headers['timezone'];
    if (timezone) {
      return timezone;
    }
    
    // 从用户代理推断（简单实现）
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('MicroMessenger')) {
      // 微信环境，默认中国时区
      return 'Asia/Shanghai';
    }
    
    // 默认时区
    return 'Asia/Shanghai';
  }

  /**
   * 创建包含时区信息的日期时间对象
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} time - 时间 (HH:mm)
   * @param {string} timezone - 时区标识
   * @returns {Date} UTC 时间对象
   */
  static createDateTime(date, time, timezone = 'Asia/Shanghai') {
    const dateTimeString = `${date} ${time}:00`;
    const localDate = new Date(dateTimeString);
    return this.convertToUTC(localDate, timezone);
  }

  /**
   * 检查两个时间段是否有冲突（考虑时区）
   * @param {Object} time1 - 第一个时间段
   * @param {Object} time2 - 第二个时间段
   * @param {string} timezone - 时区标识
   * @returns {boolean} 是否有冲突
   */
  static hasTimeConflict(time1, time2, timezone = 'Asia/Shanghai') {
    const start1 = this.createDateTime(time1.date, time1.startTime, timezone);
    const end1 = this.createDateTime(time1.date, time1.endTime, timezone);
    const start2 = this.createDateTime(time2.date, time2.startTime, timezone);
    const end2 = this.createDateTime(time2.date, time2.endTime, timezone);
    
    return start1 < end2 && start2 < end1;
  }
}

module.exports = TimezoneUtil;
