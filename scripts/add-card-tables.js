/**
 * 数据库迁移脚本 - 添加卡片功能相关表
 * 执行命令: node scripts/add-card-tables.js
 */

const { sequelize } = require('../src/shared/models');
const logger = require('../src/shared/utils/logger');

async function migrate() {
  try {
    logger.info('开始执行数据库迁移：添加卡片功能相关表...');

    // 1. 创建 coach_cards 表（卡片模板表）
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS coach_cards (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '卡片模板ID',
        coach_id BIGINT UNSIGNED NOT NULL COMMENT '教练ID',
        card_name VARCHAR(50) NOT NULL COMMENT '卡片名称',
        card_color VARCHAR(20) NOT NULL COMMENT '卡片颜色',
        card_lessons INT UNSIGNED COMMENT '课时数（NULL表示无限次数）',
        valid_days INT UNSIGNED NOT NULL COMMENT '有效天数',
        card_desc TEXT COMMENT '卡片描述',
        is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0-禁用，1-启用',
        deleted_at DATETIME COMMENT '删除时间（软删除）',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_coach_id (coach_id),
        INDEX idx_is_active (is_active),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='教练卡片模板表';
    `);
    logger.info('✓ coach_cards 表创建成功');

    // 2. 创建 student_card_instances 表（学员卡片实例表）
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS student_card_instances (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '卡片实例ID',
        coach_card_id BIGINT UNSIGNED NOT NULL COMMENT '卡片模板ID',
        student_id BIGINT UNSIGNED NOT NULL COMMENT '学员ID',
        coach_id BIGINT UNSIGNED NOT NULL COMMENT '教练ID',
        relation_id BIGINT UNSIGNED NOT NULL COMMENT '师生关系ID',
        total_lessons INT UNSIGNED COMMENT '总课时数（从模板复制，NULL表示无限次数）',
        remaining_lessons INT UNSIGNED COMMENT '剩余课时数（NULL表示无限次数）',
        used_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已使用次数',
        valid_days INT UNSIGNED NOT NULL COMMENT '有效天数（从模板复制）',
        expire_date DATE COMMENT '有效期截止日期（开卡时才设置）',
        card_status TINYINT(1) NOT NULL DEFAULT 0 COMMENT '状态：0-未开启，1-已开启，2-已停用，3-已过期',
        activated_at DATETIME COMMENT '开卡时间',
        deactivated_at DATETIME COMMENT '停卡时间',
        remaining_valid_days INT UNSIGNED COMMENT '停卡时的剩余有效天数',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_coach_card_id (coach_card_id),
        INDEX idx_student_coach (student_id, coach_id),
        INDEX idx_relation_id (relation_id),
        INDEX idx_card_status (card_status),
        INDEX idx_expire_date (expire_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学员卡片实例表';
    `);
    logger.info('✓ student_card_instances 表创建成功');

    // 3. 检查 course_bookings 表是否已存在 card_instance_id 和 booking_type 字段
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM course_bookings LIKE 'card_instance_id';
    `);

    if (columns.length === 0) {
      // 添加 card_instance_id 字段
      await sequelize.query(`
        ALTER TABLE course_bookings
        ADD COLUMN card_instance_id BIGINT UNSIGNED COMMENT '使用的卡片实例ID（如果约课时选择了卡片类型）',
        ADD INDEX idx_card_instance_id (card_instance_id);
      `);
      logger.info('✓ course_bookings 表添加 card_instance_id 字段成功');
    } else {
      logger.info('✓ course_bookings 表已存在 card_instance_id 字段，跳过');
    }

    const [bookingTypeColumns] = await sequelize.query(`
      SHOW COLUMNS FROM course_bookings LIKE 'booking_type';
    `);

    if (bookingTypeColumns.length === 0) {
      // 添加 booking_type 字段
      await sequelize.query(`
        ALTER TABLE course_bookings
        ADD COLUMN booking_type TINYINT(1) NOT NULL DEFAULT 1 COMMENT '预约类型：1-普通课程（使用分类课时），2-卡片课程（使用卡片课时）',
        ADD INDEX idx_booking_type (booking_type);
      `);
      logger.info('✓ course_bookings 表添加 booking_type 字段成功');
    } else {
      logger.info('✓ course_bookings 表已存在 booking_type 字段，跳过');
    }

    logger.info('数据库迁移完成！');
    logger.info('');
    logger.info('已创建的表：');
    logger.info('  - coach_cards: 教练卡片模板表');
    logger.info('  - student_card_instances: 学员卡片实例表');
    logger.info('');
    logger.info('已更新的表：');
    logger.info('  - course_bookings: 添加了 card_instance_id 和 booking_type 字段');

    process.exit(0);
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

// 执行迁移
migrate();

