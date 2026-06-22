/**
 * 迁移脚本：新增课单价字段体系及课时变动日志表
 *
 * 1. coach_cards 表新增 unit_price（卡片默认单价）
 * 2. student_card_instances 表新增 unit_price（实例覆盖单价）
 * 3. course_bookings 表新增 lesson_deducted（完成时实际扣减课时快照）
 * 4. 新建 lesson_change_logs 表（常规课课时变动日志）
 *
 * 使用方法：
 * node scripts/migrations/add-unit-price-fields.js
 */

try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const sequelize = require('../../src/shared/config/database');
const logger = require('../../src/shared/utils/logger');

/** @type {Array<{table: string, column: string, sql: string, desc: string}>} */
const ALTER_FIELDS = [
  {
    table: 'coach_cards',
    column: 'unit_price',
    sql: `ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0
          COMMENT '卡片课单价（元/课时），默认 0'
          AFTER card_desc`,
    desc: 'coach_cards.unit_price（卡片模板默认单价）'
  },
  {
    table: 'student_card_instances',
    column: 'unit_price',
    sql: `ADD COLUMN unit_price DECIMAL(10,2) NULL DEFAULT NULL
          COMMENT '实例覆盖单价（元/课时），NULL 则使用模板单价'
          AFTER deduct_lessons_per_use`,
    desc: 'student_card_instances.unit_price（实例覆盖单价）'
  },
  {
    table: 'course_bookings',
    column: 'lesson_deducted',
    sql: `ADD COLUMN lesson_deducted INT UNSIGNED NULL DEFAULT NULL
          COMMENT '完成时实际扣减课时数快照；普通课=1，卡片课=deduct_lessons_per_use；NULL=历史老数据'
          AFTER card_instance_id`,
    desc: 'course_bookings.lesson_deducted（完成时扣减课时快照）'
  }
];

/** 新建 lesson_change_logs 表的 DDL */
const CREATE_LOG_TABLE_SQL = `
  CREATE TABLE lesson_change_logs (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    relation_id   BIGINT UNSIGNED NOT NULL                COMMENT '师生关系ID',
    coach_id      BIGINT UNSIGNED NOT NULL                COMMENT '教练ID（冗余）',
    student_id    BIGINT UNSIGNED NULL     DEFAULT NULL   COMMENT '学员ID（冗余，待激活关系可为 NULL）',
    category_id   INT             NOT NULL                COMMENT '课程分类ID',
    change_type   TINYINT         NOT NULL                COMMENT '变动类型：1-增加，2-减少，3-清零',
    before_lessons INT            NOT NULL DEFAULT 0      COMMENT '变动前剩余课时',
    after_lessons  INT            NOT NULL DEFAULT 0      COMMENT '变动后剩余课时',
    change_amount  INT            NOT NULL DEFAULT 0      COMMENT '变动数量（绝对值）',
    unit_price     DECIMAL(10,2)  NULL     DEFAULT NULL   COMMENT '变动时课单价快照（元/课时）',
    operator_id   BIGINT UNSIGNED NOT NULL                COMMENT '操作人ID（通常为教练）',
    remark        VARCHAR(200)    NULL     DEFAULT NULL   COMMENT '备注',
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '日志时间',
    PRIMARY KEY (id),
    INDEX idx_relation_id  (relation_id),
    INDEX idx_coach_id     (coach_id),
    INDEX idx_student_id   (student_id),
    INDEX idx_change_type  (change_type),
    INDEX idx_created_at   (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='常规课课时变动日志表';
`;

async function migrate() {
  try {
    logger.info('开始执行课单价字段迁移...');
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 1. 为现有表添加字段
    for (const field of ALTER_FIELDS) {
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${field.table}'
          AND COLUMN_NAME = '${field.column}'
      `);

      if (results.length > 0) {
        logger.info(`✓ ${field.desc} 字段已存在，跳过`);
        continue;
      }

      await sequelize.query(`ALTER TABLE ${field.table} ${field.sql}`);
      logger.info(`✓ ${field.desc} 字段添加成功`);
    }

    // 2. 创建 lesson_change_logs 表
    const [tableExists] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'lesson_change_logs'
    `);

    if (tableExists.length > 0) {
      logger.info('✓ lesson_change_logs 表已存在，跳过');
    } else {
      await sequelize.query(CREATE_LOG_TABLE_SQL);
      logger.info('✓ lesson_change_logs 表创建成功');
    }

    logger.info('');
    logger.info('迁移完成！');
    logger.info('');
    logger.info('本次变更汇总：');
    ALTER_FIELDS.forEach(f => logger.info(`  - 新增字段 ${f.desc}`));
    logger.info('  - 新建表 lesson_change_logs（常规课课时变动日志）');

  } catch (error) {
    logger.error('迁移失败:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

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
