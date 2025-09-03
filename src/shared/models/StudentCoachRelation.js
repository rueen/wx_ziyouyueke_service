const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 学员教练关系模型
 */
const StudentCoachRelation = sequelize.define('student_coach_relations', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学员ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID'
  },
  remaining_lessons: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '剩余课时'
  },
  coach_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '教练备注'
  },
  student_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '学员备注'
  },
  relation_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '关系状态：0-已解除，1-正常'
  },
  bind_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '绑定时间'
  },
  last_course_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后上课时间'
  }
}, {
  tableName: 'student_coach_relations',
  comment: '学员教练关系表',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'coach_id'],
      name: 'uk_student_coach'
    },
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      fields: ['relation_status'],
      name: 'idx_relation_status'
    }
  ]
});

/**
 * 实例方法：减少课时
 */
StudentCoachRelation.prototype.decreaseLessons = function(count = 1) {
  if (this.remaining_lessons < count) {
    throw new Error('剩余课时不足');
  }
  return this.update({ 
    remaining_lessons: this.remaining_lessons - count,
    last_course_time: new Date()
  });
};

/**
 * 实例方法：增加课时
 */
StudentCoachRelation.prototype.increaseLessons = function(count = 1) {
  return this.update({ 
    remaining_lessons: this.remaining_lessons + count
  });
};

module.exports = StudentCoachRelation; 