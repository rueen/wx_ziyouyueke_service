const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 教练设置模型
 * 每位教练只有一条配置记录（coach_id UNIQUE），后期可按需新增字段扩展
 */
const CoachSetting = sequelize.define('coach_settings', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    unique: true,
    comment: '教练ID（FK → users.id），一个教练只有一条配置'
  },
  completion_method: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'scan',
    comment: '课程完成方式：scan-扫码完成，manual-手动完成'
  }
}, {
  tableName: 'coach_settings',
  comment: '教练设置表',
  indexes: [
    {
      unique: true,
      fields: ['coach_id'],
      name: 'uk_coach_id'
    }
  ]
});

module.exports = CoachSetting;
