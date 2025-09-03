const fs = require('fs');
const path = require('path');

/**
 * 简单的日志工具类
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 获取当前时间戳
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * 写入日志文件
   */
  writeToFile(level, message) {
    const timestamp = this.getTimestamp();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${today}.log`);
    
    fs.appendFileSync(logFile, logMessage);
  }

  /**
   * 格式化消息
   */
  formatMessage(message, ...args) {
    if (typeof message === 'object') {
      return JSON.stringify(message, null, 2);
    }
    return args.length > 0 ? `${message} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}` : message;
  }

  /**
   * 信息日志
   */
  info(message, ...args) {
    const formattedMessage = this.formatMessage(message, ...args);
    console.log(`\x1b[32m[INFO]\x1b[0m ${formattedMessage}`);
    this.writeToFile('info', formattedMessage);
  }

  /**
   * 错误日志
   */
  error(message, ...args) {
    const formattedMessage = this.formatMessage(message, ...args);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${formattedMessage}`);
    this.writeToFile('error', formattedMessage);
  }

  /**
   * 警告日志
   */
  warn(message, ...args) {
    const formattedMessage = this.formatMessage(message, ...args);
    console.warn(`\x1b[33m[WARN]\x1b[0m ${formattedMessage}`);
    this.writeToFile('warn', formattedMessage);
  }

  /**
   * 调试日志
   */
  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage(message, ...args);
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${formattedMessage}`);
      this.writeToFile('debug', formattedMessage);
    }
  }
}

module.exports = new Logger(); 