/**
 * 为 student_coach_relations 表添加学员档案字段的数据库迁移脚本
 *
 * 新增字段：gender（性别）、height（身高cm）、weight（体重kg）、birthday（生日）
 * 由教练在师生关系中维护，用于记录学员的基本健康档案
 *
 * 使用方法：
 * node scripts/migrations/add-student-profile-fields.js
 */

try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const sequelize = require('../../src/shared/config/database');
const logger = require('../../src/shared/utils/logger');

/** @type {Array<{column: string, sql: string, desc: string}>} */
const FIELDS = [
  {
    column: 'gender',
    sql: `ADD COLUMN gender TINYINT(1) NULL DEFAULT NULL
          COMMENT '性别：0-未知，1-男，2-女'
          AFTER student_name`,
    desc: 'gender（性别）'
  },
  {
    column: 'height',
    sql: `ADD COLUMN height DECIMAL(5,1) NULL DEFAULT NULL
          COMMENT '身高（cm）'
          AFTER gender`,
    desc: 'height（身高 cm）'
  },
  {
    column: 'weight',
    sql: `ADD COLUMN weight DECIMAL(5,1) NULL DEFAULT NULL
          COMMENT '体重（kg）'
          AFTER height`,
    desc: 'weight（体重 kg）'
  },
  {
    column: 'birthday',
    sql: `ADD COLUMN birthday DATE NULL DEFAULT NULL
          COMMENT '生日（YYYY-MM-DD）'
          AFTER weight`,
    desc: 'birthday（生日）'
  }
];

async function migrate() {
  try {
    logger.info('开始执行学员档案字段迁移...');
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    for (const field of FIELDS) {
      const [results] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'student_coach_relations'
          AND COLUMN_NAME = '${field.column}'
      `);

      if (results.length > 0) {
        logger.info(`✓ ${field.desc} 字段已存在，跳过`);
        continue;
      }

      await sequelize.query(`ALTER TABLE student_coach_relations ${field.sql}`);
      logger.info(`✓ ${field.desc} 字段添加成功`);
    }

    logger.info('迁移完成！');
    logger.info('');
    logger.info('已添加字段（student_coach_relations）：');
    FIELDS.forEach(f => logger.info(`  - ${f.desc}`));

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
