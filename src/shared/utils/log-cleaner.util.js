const fs = require('fs');
const path = require('path');
const logger = require('../../../utils/logger');

/**
 * 日志清理工具
 */
class LogCleaner {
  /**
   * 清理指定天数前的日志文件
   * @param {number} days - 保留天数
   */
  static async cleanOldLogs(days = 30) {
    try {
      const logsDir = path.join(__dirname, '../../../logs');
      
      if (!fs.existsSync(logsDir)) {
        logger.info('日志目录不存在，跳过清理');
        return;
      }

      const files = fs.readdirSync(logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
            logger.info(`删除过期日志文件: ${file}`);
          }
        }
      }

      logger.info(`日志清理完成，删除了 ${deletedCount} 个过期文件`);
    } catch (error) {
      logger.error('清理日志文件失败:', error);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const days = process.argv[2] ? parseInt(process.argv[2]) : 30;
  LogCleaner.cleanOldLogs(days);
}

module.exports = LogCleaner;
