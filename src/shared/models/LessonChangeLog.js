const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 常规课课时变动日志模型
 *
 * 记录师生关系中常规课课时的每次增减操作，供续课统计和余额变动追溯使用。
 * 写入时机：
 *   1. PUT /api/h5/relations/:id 教练手动调整课时（增加/减少/清零）
 *   2. CourseController.completeCourse / restoreComplete 普通课完成自动消课
 */
const LessonChangeLog = sequelize.define('lesson_change_logs', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '日志ID'
  },
  relation_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '师生关系ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID（冗余，便于按教练查询）'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    defaultValue: null,
    comment: '学员ID（冗余，待激活关系可为 NULL）'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '课程分类ID'
  },
  change_type: {
    type: DataTypes.TINYINT,
    allowNull: false,
    comment: '变动类型：1-增加（购课/续课），2-减少（消课/手动调减），3-清零'
  },
  before_lessons: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '变动前剩余课时'
  },
  after_lessons: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '变动后剩余课时'
  },
  change_amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '变动数量（绝对值）；清零时为清零前的剩余数'
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: '变动时的课单价快照（元/课时），便于历史收入回溯'
  },
  operator_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '操作人ID（通常为教练）'
  },
  remark: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: null,
    comment: '备注（如：首购、续课、消课等）'
  }
}, {
  tableName: 'lesson_change_logs',
  comment: '常规课课时变动日志表',
  updatedAt: false, // 只有 created_at，无需 updated_at
  indexes: [
    {
      fields: ['relation_id'],
      name: 'idx_relation_id'
    },
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      fields: ['student_id'],
      name: 'idx_student_id'
    },
    {
      fields: ['change_type'],
      name: 'idx_change_type'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    }
  ]
});

/**
 * 类方法：批量创建课时变动日志
 *
 * 比较旧课时数组和新课时数组，对有变动的分类写入日志
 *
 * @param {Array} oldLessons - 变动前的 lessons 数组
 * @param {Array} newLessons - 变动后的 lessons 数组
 * @param {Object} options
 * @param {number} options.relationId - 师生关系ID
 * @param {number} options.coachId - 教练ID
 * @param {number|null} options.studentId - 学员ID
 * @param {number} options.operatorId - 操作人ID
 * @param {Array} [options.unitPriceMap=[]] - 各分类课单价映射 [{category_id, unit_price}]
 * @param {string|null} [options.remark=null] - 备注
 * @param {import('sequelize').Transaction|null} [options.transaction=null] - 事务
 * @returns {Promise<void>}
 */
LessonChangeLog.createFromDiff = async function(oldLessons, newLessons, options) {
  const {
    relationId,
    coachId,
    studentId,
    operatorId,
    unitPriceMap = [],
    remark = null,
    transaction = null
  } = options;

  const logs = [];

  for (const newEntry of newLessons) {
    const { category_id, remaining_lessons, is_cleared } = newEntry;
    const oldEntry = (oldLessons || []).find(l => Number(l.category_id) === Number(category_id));
    const before = oldEntry ? (oldEntry.remaining_lessons || 0) : 0;
    const after = remaining_lessons || 0;

    // 取该分类的课单价快照
    const priceEntry = unitPriceMap.find(p => Number(p.category_id) === Number(category_id));
    const unitPrice = priceEntry ? priceEntry.unit_price : null;

    if (is_cleared && !(oldEntry && oldEntry.is_cleared)) {
      // 清零操作
      logs.push({
        relation_id: relationId,
        coach_id: coachId,
        student_id: studentId || null,
        category_id: Number(category_id),
        change_type: 3,
        before_lessons: before,
        after_lessons: 0,
        change_amount: before,
        unit_price: unitPrice,
        operator_id: operatorId,
        remark: remark || '清零'
      });
    } else if (!is_cleared && after > before) {
      // 增加
      logs.push({
        relation_id: relationId,
        coach_id: coachId,
        student_id: studentId || null,
        category_id: Number(category_id),
        change_type: 1,
        before_lessons: before,
        after_lessons: after,
        change_amount: after - before,
        unit_price: unitPrice,
        operator_id: operatorId,
        remark
      });
    } else if (!is_cleared && after < before) {
      // 减少
      logs.push({
        relation_id: relationId,
        coach_id: coachId,
        student_id: studentId || null,
        category_id: Number(category_id),
        change_type: 2,
        before_lessons: before,
        after_lessons: after,
        change_amount: before - after,
        unit_price: unitPrice,
        operator_id: operatorId,
        remark
      });
    }
    // 相等时不写日志
  }

  if (logs.length > 0) {
    await LessonChangeLog.bulkCreate(logs, { transaction });
  }
};

/**
 * 类方法：写入单条消课/回补日志（普通课完成/补录时调用）
 *
 * @param {Object} options
 * @param {number} options.relationId - 师生关系ID
 * @param {number} options.coachId - 教练ID
 * @param {number|null} options.studentId - 学员ID
 * @param {number} options.categoryId - 课程分类ID
 * @param {number} options.changeType - 2=消课减少，1=撤销回补
 * @param {number} options.beforeLessons - 变动前课时
 * @param {number} options.afterLessons - 变动后课时
 * @param {number|null} [options.unitPrice=null] - 课单价快照
 * @param {number} options.operatorId - 操作人ID
 * @param {string|null} [options.remark=null] - 备注
 * @param {import('sequelize').Transaction|null} [options.transaction=null] - 事务
 * @returns {Promise<LessonChangeLog>}
 */
LessonChangeLog.createCourseLog = async function(options) {
  const {
    relationId,
    coachId,
    studentId,
    categoryId,
    changeType,
    beforeLessons,
    afterLessons,
    unitPrice = null,
    operatorId,
    remark = null,
    transaction = null
  } = options;

  return await LessonChangeLog.create({
    relation_id: relationId,
    coach_id: coachId,
    student_id: studentId || null,
    category_id: Number(categoryId),
    change_type: changeType,
    before_lessons: beforeLessons,
    after_lessons: afterLessons,
    change_amount: Math.abs(afterLessons - beforeLessons),
    unit_price: unitPrice,
    operator_id: operatorId,
    remark
  }, { transaction });
};

module.exports = LessonChangeLog;
