const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 教练取消次数限制配置模型
 * 每位教练只有一条配置记录（coach_id UNIQUE）
 */
const CancellationSetting = sequelize.define('cancellation_settings', {
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
  is_enabled: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '是否启用：0-关闭，1-开启'
  },
  time_window: {
    type: DataTypes.ENUM('day', 'week', 'month', 'quarter', 'year'),
    allowNull: false,
    defaultValue: 'week',
    comment: '统计周期：day-自然日，week-自然周，month-自然月，quarter-自然季度，year-自然年'
  },
  max_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: '周期内学员最多可取消次数'
  }
}, {
  tableName: 'cancellation_settings',
  comment: '教练取消次数限制配置表',
  indexes: [
    {
      unique: true,
      fields: ['coach_id'],
      name: 'uk_coach_id'
    }
  ]
});

module.exports = CancellationSetting;
