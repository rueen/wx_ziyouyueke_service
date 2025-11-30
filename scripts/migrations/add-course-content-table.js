/**
 * 添加课程内容表的数据库迁移脚本
 * 
 * 使用方法：
 * node scripts/migrations/add-course-content-table.js
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const sequelize = require('../../src/shared/config/database');
const logger = require('../../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行课程内容表迁移...');

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 创建课程内容表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS course_contents (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '课程内容ID',
        course_type TINYINT(1) NOT NULL COMMENT '课程类型：1-一对一课程，2-团课',
        booking_id BIGINT UNSIGNED NULL COMMENT '一对一课程ID（course_type=1时必填）',
        group_course_id BIGINT UNSIGNED NULL COMMENT '团课ID（course_type=2时必填）',
        coach_id BIGINT UNSIGNED NOT NULL COMMENT '教练ID（用于权限控制）',
        text_content TEXT NULL COMMENT '文本内容',
        images JSON NULL COMMENT '图片URL数组，格式：["url1", "url2"]',
        audios JSON NULL COMMENT '音频数组，格式：[{"url": "audio_url", "duration": 60}]',
        videos JSON NULL COMMENT '视频数组，格式：[{"url": "video_url", "duration": 120}]',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_group_course_id (group_course_id),
        INDEX idx_coach_id (coach_id),
        INDEX idx_course_type (course_type),
        CONSTRAINT fk_course_content_booking FOREIGN KEY (booking_id) 
          REFERENCES course_bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_course_content_group_course FOREIGN KEY (group_course_id) 
          REFERENCES group_courses(id) ON DELETE CASCADE,
        CONSTRAINT fk_course_content_coach FOREIGN KEY (coach_id) 
          REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程内容表';
    `);

    logger.info('✓ 课程内容表创建成功');

    logger.info('迁移完成！');
    logger.info('');
    logger.info('已创建的表：');
    logger.info('  - course_contents: 课程内容表');
    logger.info('');
    logger.info('功能说明：');
    logger.info('  - 支持一对一课程和团课的内容记录');
    logger.info('  - 支持文本、图片、音频、视频四种内容类型');
    logger.info('  - 文件存储在阿里云OSS');
    
  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('所有迁移执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移执行失败:', error);
      process.exit(1);
    });
}

module.exports = migrate;

