const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 教练休息时段模型
 * 教练可为某天的具体时间段设置休息，其他天不受影响
 */
const BlockedSlot = sequelize.define('blocked_slots', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  coach_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '教练ID（FK → users.id）'
  },
  slot_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '休息日期（YYYY-MM-DD）'
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '时间段开始（HH:mm:ss）'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '时间段结束（HH:mm:ss）'
  }
}, {
  tableName: 'blocked_slots',
  comment: '教练休息时段表',
  indexes: [
    {
      unique: true,
      fields: ['coach_id', 'slot_date', 'start_time', 'end_time'],
      name: 'uk_slot'
    }
  ]
});

module.exports = BlockedSlot;
