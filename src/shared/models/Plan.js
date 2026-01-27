const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 训练计划模型
 * 用于记录教练为学员制定的训练计划
 */
const Plan = sequelize.define('plans', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '训练计划ID'
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
  plan_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '计划名称'
  },
  plan_content: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '计划内容，JSON格式，方便扩展'
  },
  is_visible: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否对学员可见：0-不可见，1-可见'
  }
}, {
  tableName: 'plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_student_id',
      fields: ['student_id']
    },
    {
      name: 'idx_coach_id',
      fields: ['coach_id']
    },
    {
      name: 'idx_student_coach',
      fields: ['student_id', 'coach_id']
    },
    {
      name: 'idx_is_visible',
      fields: ['is_visible']
    }
  ]
});

module.exports = Plan;
