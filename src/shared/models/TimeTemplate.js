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
  max_advance_nums: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '同时段最多可预约人数'
  },
  time_slots: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '时间段数组，格式：[{"startTime":"09:00","endTime":"12:00"}]'
  },
  date_slots: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [
      { id: 0, text: '周日', checked: true },
      { id: 1, text: '周一', checked: true },
      { id: 2, text: '周二', checked: true },
      { id: 3, text: '周三', checked: true },
      { id: 4, text: '周四', checked: true },
      { id: 5, text: '周五', checked: true },
      { id: 6, text: '周六', checked: true }
    ],
    comment: '可预约日期配置，格式：[{"id":0,"text":"周日","checked":true}]'
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否启用：0-禁用，1-启用'
  },
  time_type: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '时间类型：0-全日程统一模板(每天一样)，1-按周历循环模板(每周几一样)，2-自由日程模板'
  },
  week_slots: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: '周历时间段配置，格式：[{"id":0,"text":"周日","checked":true,"time_slots":[{"startTime":"00:00","endTime":"01:00"}]}]'
  },
  free_time_range: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: '自由日程时间范围，仅 time_type 为 2 时使用，格式：{"startTime":"09:00","endTime":"18:00"}'
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
 * @param {string} startTime - 开始时间 (HH:mm)
 * @param {string} endTime - 结束时间 (HH:mm)
 * @param {number} dayOfWeek - 星期几 (0-6，仅 time_type 为 1 时需要)
 * @returns {boolean} 是否可预约
 */
TimeTemplate.prototype.isTimeSlotAvailable = function(startTime, endTime, dayOfWeek) {
  // time_type 为 2（自由日程模板）：使用 free_time_range 字段
  if (this.time_type === 2) {
    if (!this.free_time_range || !this.free_time_range.startTime || !this.free_time_range.endTime) {
      return false;
    }
    
    // 检查预约时间段是否完全在时间范围内
    return startTime >= this.free_time_range.startTime && endTime <= this.free_time_range.endTime;
  }
  
  // time_type 为 1（按周历循环模板）：使用 week_slots 字段
  if (this.time_type === 1) {
    if (!this.week_slots || !Array.isArray(this.week_slots)) {
      return false;
    }
    
    // 根据星期几找到对应的配置
    const daySlot = this.week_slots.find(slot => slot.id === dayOfWeek);
    if (!daySlot || !daySlot.checked || !daySlot.time_slots || !Array.isArray(daySlot.time_slots)) {
      return false;
    }
    
    // 检查时间段是否在配置的时间段内
    return daySlot.time_slots.some(slot => {
      return startTime >= slot.startTime && endTime <= slot.endTime;
    });
  }
  
  // time_type 为 0（全日程统一模板）：使用 time_slots 字段
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
 * 实例方法：获取自由日程的时间范围（仅 time_type 为 2 时使用）
 * @returns {Object|null} 返回时间范围对象 {startTime, endTime} 或 null
 */
TimeTemplate.prototype.getFreeTimeRange = function() {
  if (this.time_type !== 2) {
    return null;
  }
  
  return this.free_time_range;
};

/**
 * 实例方法：验证自由时间段是否符合规则（仅 time_type 为 2 时使用）
 * @param {string} startTime - 开始时间 (HH:mm)
 * @param {string} endTime - 结束时间 (HH:mm)
 * @returns {Object} {valid: boolean, message: string}
 */
TimeTemplate.prototype.validateFreeTimeSlot = function(startTime, endTime) {
  if (this.time_type !== 2) {
    return { valid: false, message: '当前模板不是自由日程模板' };
  }
  
  const timeRange = this.getFreeTimeRange();
  if (!timeRange || !timeRange.startTime || !timeRange.endTime) {
    return { valid: false, message: '未配置时间范围' };
  }
  
  // 检查是否在时间范围内
  if (startTime < timeRange.startTime || endTime > timeRange.endTime) {
    return { valid: false, message: `预约时间必须在 ${timeRange.startTime} 至 ${timeRange.endTime} 之间` };
  }
  
  // 检查开始时间必须小于结束时间
  if (startTime >= endTime) {
    return { valid: false, message: '结束时间必须大于开始时间' };
  }
  
  return { valid: true, message: '时间段有效' };
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