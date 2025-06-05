const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * 课程预约模型
 */
const CourseBooking = sequelize.define('course_bookings', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '课程ID'
  },
  booking_no: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '预约单号'
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
  relation_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学员教练关系ID'
  },
  template_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '时间模板ID'
  },
  course_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '上课日期'
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '开始时间'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '结束时间'
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '上课地点'
  },
  student_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '学员备注'
  },
  coach_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '教练备注'
  },
  booking_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '预约状态：1-待确认，2-已确认，3-已完成，4-已取消'
  },
  confirm_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '确认时间'
  },
  complete_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  cancel_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancel_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '取消原因'
  },
  canceled_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '取消操作人ID'
  }
}, {
  tableName: 'course_bookings',
  comment: '课程预约表',
  indexes: [
    {
      unique: true,
      fields: ['booking_no'],
      name: 'uk_booking_no'
    },
    {
      fields: ['student_id', 'course_date'],
      name: 'idx_student_date'
    },
    {
      fields: ['coach_id', 'course_date'],
      name: 'idx_coach_date'
    },
    {
      fields: ['relation_id'],
      name: 'idx_relation_id'
    },
    {
      fields: ['booking_status'],
      name: 'idx_booking_status'
    },
    {
      fields: ['course_date', 'start_time'],
      name: 'idx_course_date_time'
    }
  ]
});

/**
 * Hook：创建预约单号
 */
CourseBooking.beforeCreate(async (booking, options) => {
  if (!booking.booking_no) {
    const prefix = 'BK';
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    booking.booking_no = `${prefix}${timestamp}${random}`;
  }
});

/**
 * 实例方法：确认课程
 */
CourseBooking.prototype.confirmBooking = function(coachRemark = null) {
  return this.update({
    booking_status: 2,
    confirm_time: new Date(),
    coach_remark: coachRemark
  });
};

/**
 * 实例方法：完成课程
 */
CourseBooking.prototype.completeBooking = function(coachRemark = null) {
  return this.update({
    booking_status: 3,
    complete_time: new Date(),
    coach_remark: coachRemark
  });
};

/**
 * 实例方法：取消课程
 */
CourseBooking.prototype.cancelBooking = function(cancelReason, canceledBy) {
  return this.update({
    booking_status: 4,
    cancel_time: new Date(),
    cancel_reason: cancelReason,
    canceled_by: canceledBy
  });
};

/**
 * 实例方法：获取状态文本
 */
CourseBooking.prototype.getStatusText = function() {
  const statusMap = {
    1: '待确认',
    2: '已确认',
    3: '已完成',
    4: '已取消'
  };
  return statusMap[this.booking_status] || '未知状态';
};

/**
 * 类方法：检查时间冲突
 */
CourseBooking.checkTimeConflict = async function(coachId, courseDate, startTime, endTime, excludeId = null) {
  const where = {
    coach_id: coachId,
    course_date: courseDate,
    booking_status: [1, 2], // 待确认或已确认的课程
    [sequelize.Op.or]: [
      {
        start_time: {
          [sequelize.Op.between]: [startTime, endTime]
        }
      },
      {
        end_time: {
          [sequelize.Op.between]: [startTime, endTime]
        }
      },
      {
        [sequelize.Op.and]: [
          { start_time: { [sequelize.Op.lte]: startTime } },
          { end_time: { [sequelize.Op.gte]: endTime } }
        ]
      }
    ]
  };

  if (excludeId) {
    where.id = { [sequelize.Op.ne]: excludeId };
  }

  const conflictBooking = await this.findOne({ where });
  return conflictBooking !== null;
};

module.exports = CourseBooking; 