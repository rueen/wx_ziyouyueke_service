const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 训练类型模型
 * 每位教练可创建多个训练类型，每个类型可定义多个字段（如腰围、臀围等）
 */
const TrainingRecordType = sequelize.define('training_record_types', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '归属教练ID（FK → users.id）'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '类型名称，如"纬度变化"'
  },
  fields: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: '字段名数组，如 ["腰围","臀围","胸围"]，最多20个'
  }
}, {
  tableName: 'training_record_types',
  comment: '训练类型表',
  paranoid: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      unique: true,
      fields: ['coach_id', 'name', 'deleted_at'],
      name: 'uk_coach_type_name'
    }
  ]
});

module.exports = TrainingRecordType;
