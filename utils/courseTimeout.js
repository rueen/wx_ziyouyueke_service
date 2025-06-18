const { CourseBooking } = require('../models');
const logger = require('./logger');

/**
 * 课程超时管理工具类
 */
class CourseTimeoutManager {
  
  /**
   * 检查并自动取消超时课程
   * @returns {Object} 执行结果
   */
  static async checkAndCancelTimeoutCourses() {
    try {
      logger.info('开始检查超时课程...');
      
      const result = await CourseBooking.autoTimeoutCancel();
      
      if (result.success && result.cancelledCount > 0) {
        logger.info(`成功自动取消了 ${result.cancelledCount} 个超时课程`);
      }
      
      return result;
      
    } catch (error) {
      logger.error('检查超时课程失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 启动定时任务
   * 每5分钟检查一次超时课程
   */
  static startScheduledTask() {
    // 立即执行一次
    this.checkAndCancelTimeoutCourses();
    
    // 设置定时任务，每5分钟执行一次
    setInterval(() => {
      this.checkAndCancelTimeoutCourses();
    }, 5 * 60 * 1000); // 5分钟 = 5 * 60 * 1000毫秒
    
    logger.info('课程超时检查定时任务已启动，每5分钟执行一次');
  }

  /**
   * 手动触发超时检查（用于API调用）
   */
  static async triggerManualCheck() {
    return await this.checkAndCancelTimeoutCourses();
  }
}

module.exports = CourseTimeoutManager; 