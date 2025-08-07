/*
 * @Author: diaochan
 * @Date: 2025-08-07 09:50:46
 * @LastEditors: diaochan
 * @LastEditTime: 2025-08-07 10:52:25
 * @Description: 
 */
const TimezoneUtil = require('../utils/timezone');

/**
 * 时区中间件
 * 从请求头中提取时区信息并添加到请求对象中
 */
const timezoneMiddleware = (req, res, next) => {
  // 从请求头获取时区信息
  req.timezone = TimezoneUtil.getTimezoneFromRequest(req);

  // 添加时区工具方法到请求对象
  req.getLocalDate = () => TimezoneUtil.getCurrentDate(req.timezone);
  req.getLocalTime = () => TimezoneUtil.getCurrentTime(req.timezone);
  req.formatTime = (date, format) => TimezoneUtil.formatTime(date, req.timezone, format);
  req.isTimeExpired = (courseDate, startTime) => TimezoneUtil.isTimeExpired(courseDate, startTime, req.timezone);
  
  next();
};

module.exports = timezoneMiddleware;
