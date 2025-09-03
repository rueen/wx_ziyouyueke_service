const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 时间模板模型
 */
const TimeTemplate = sequelize.define('time_templates', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID'
  },
  min_advance_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '最少提前预约天数'
  },
  max_advance_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    comment: '最多可预约天数'
  },
  time_slots: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '时间段数组，格式：[{"startTime":"09:00","endTime":"12:00"}]'
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否启用：0-禁用，1-启用'
  }
}, {
  tableName: 'time_templates',
  comment: '时间模板表',
  indexes: [
    {
      fields: ['coach_id', 'is_active'],
      name: 'idx_coach_active'
    }
  ]
});

/**
 * 实例方法：检查时间是否可预约
 */
TimeTemplate.prototype.isTimeSlotAvailable = function(startTime, endTime) {
  if (!this.time_slots || !Array.isArray(this.time_slots)) {
    return false;
  }
  
  return this.time_slots.some(slot => {
    return startTime >= slot.startTime && endTime <= slot.endTime;
  });
};

/**
 * 实例方法：检查日期是否在预约范围内
 */
TimeTemplate.prototype.isDateInRange = function(targetDate) {
  const today = new Date();
  const target = new Date(targetDate);
  
  // 计算天数差
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= this.min_advance_days && diffDays <= this.max_advance_days;
};

/**
 * 类方法：获取教练的活跃模板
 */
TimeTemplate.getActiveByCoachId = function(coachId) {
  return this.findOne({
    where: {
      coach_id: coachId,
      is_active: 1
    }
  });
};

module.exports = TimeTemplate; 