const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 训练记录模型
 * 由教练创建，记录学员的训练数据（体测数据、内容描述、图片等）
 */
const TrainingRecord = sequelize.define('training_records', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学员ID（FK → users.id）'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID（FK → users.id）'
  },
  type_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '训练类型ID（FK → training_record_types.id，非必填）'
  },
  type_values: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '类型字段值，如 {"腰围":"75cm","臀围":"90cm"}，每个值最长30字符（非必填）'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '记录内容，最多500字（非必填）'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '图片URL数组，最多9张（非必填）'
  }
}, {
  tableName: 'training_records',
  comment: '训练记录表',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['student_id'],
      name: 'idx_student_id'
    },
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      fields: ['student_id', 'coach_id'],
      name: 'idx_student_coach'
    },
    {
      fields: ['type_id'],
      name: 'idx_type_id'
    },
    {
      fields: ['created_at'],
      name: 'idx_created_at'
    }
  ]
});

module.exports = TrainingRecord;
