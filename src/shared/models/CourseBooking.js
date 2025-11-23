const { DataTypes, Op } = require('sequelize');
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
    comment: '预约ID'
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
    allowNull: true,
    comment: '师生关系ID'
  },
  course_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '课程日期（YYYY-MM-DD）'
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '开始时间（HH:mm）'
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false,
    comment: '结束时间（HH:mm）'
  },
  booking_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '预约状态：1-待确认，2-已确认，3-已完成，4-已取消，5-超时取消'
  },
  address_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '地址ID'
  },
  category_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '课程分类ID'
  },
  card_instance_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '使用的卡片实例ID（如果约课时选择了卡片类型）'
  },
  booking_type: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '预约类型：1-普通课程（使用分类课时），2-卡片课程（使用卡片课时）'
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
  created_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '创建人ID'
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '确认时间'
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancelled_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '取消人ID'
  },
  cancel_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '取消原因'
  },
  complete_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  }
}, {
  tableName: 'course_bookings',
  comment: '课程预约表',
  indexes: [
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
    },
    {
      fields: ['address_id'],
      name: 'idx_address_id'
    },
    {
      fields: ['category_id'],
      name: 'idx_category_id'
    },
    {
      fields: ['card_instance_id'],
      name: 'idx_card_instance_id'
    },
    {
      fields: ['booking_type'],
      name: 'idx_booking_type'
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
    confirmed_at: new Date(),
    coach_remark: coachRemark
  });
};

/**
 * 实例方法：完成课程
 */
CourseBooking.prototype.completeBooking = function(coachRemark = null) {
  return this.update({
    booking_status: 3,
    complete_at: new Date(),
    coach_remark: coachRemark
  });
};

/**
 * 实例方法：取消课程
 */
CourseBooking.prototype.cancelBooking = function(cancelReason, cancelledBy) {
  return this.update({
    booking_status: 4,
    cancelled_at: new Date(),
    cancel_reason: cancelReason,
    cancelled_by: cancelledBy
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
    4: '已取消',
    5: '超时取消'
  };
  return statusMap[this.booking_status] || '未知状态';
};

/**
 * 实例方法：超时取消课程
 */
CourseBooking.prototype.timeoutCancel = function() {
  return this.update({
    booking_status: 5,
    cancelled_at: new Date(),
    cancel_reason: '超时，系统自动取消'
  });
};

/**
 * 类方法：自动取消超时课程
 * 检查所有待确认状态且开始时间已过的课程，自动取消
 */
CourseBooking.autoTimeoutCancel = async function() {
  const currentDateTime = new Date();
  const currentDate = currentDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentTime = currentDateTime.toTimeString().slice(0, 8); // HH:mm:ss
  
  try {
    // 查找需要超时取消的课程
    const timeoutCourses = await this.findAll({
      where: {
        booking_status: 1, // 待确认状态
        [Op.or]: [
          // 课程日期小于今天
          {
            course_date: {
              [Op.lt]: currentDate
            }
          },
          // 课程日期等于今天且开始时间小于当前时间
          {
            [Op.and]: [
              { course_date: currentDate },
              { start_time: { [Op.lt]: currentTime } }
            ]
          }
        ]
      },
      include: [
        {
          model: sequelize.models.users,
          as: 'student',
          attributes: ['id', 'nickname', 'openid']
        },
        {
          model: sequelize.models.users,
          as: 'coach',
          attributes: ['id', 'nickname', 'openid']
        },
        {
          model: sequelize.models.addresses,
          as: 'address',
          attributes: ['id', 'name']
        }
      ]
    });

    let cancelledCount = 0;
    
    // 逐个取消超时课程
    for (const course of timeoutCourses) {
      const updatedCourse = await course.timeoutCancel();
      cancelledCount++;

      try {
        const SubscribeMessageService = require('../services/subscribeMessageService');
        const cancelReason = updatedCourse.cancel_reason || '超时，系统自动取消';

        // 复用已加载的关联数据
        updatedCourse.student = course.student;
        updatedCourse.coach = course.coach;
        updatedCourse.address = course.address;

        if (course.student) {
          await SubscribeMessageService.sendBookingCancelNotice({
            booking: updatedCourse,
            receiverUser: course.student,
            address: course.address,
            cancelReason
          });
        }

        if (course.coach) {
          await SubscribeMessageService.sendBookingCancelNotice({
            booking: updatedCourse,
            receiverUser: course.coach,
            address: course.address,
            cancelReason
          });
        }
      } catch (error) {
        console.error('自动取消课程后发送通知失败:', {
          bookingId: course.id,
          error: error.message
        });
      }
    }

    if (cancelledCount > 0) {
      console.log(`自动取消了 ${cancelledCount} 个超时课程`);
    }

    return {
      success: true,
      cancelledCount: cancelledCount,
      message: `成功自动取消 ${cancelledCount} 个超时课程`
    };
    
  } catch (error) {
    console.error('自动取消超时课程失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 类方法：检查时间冲突
 */
CourseBooking.checkTimeConflict = async function(coachId, courseDate, startTime, endTime, excludeId = null) {
  const where = {
    coach_id: coachId,
    course_date: courseDate,
    booking_status: [1, 2], // 待确认、已确认的课程
    [Op.or]: [
      {
        start_time: {
          [Op.between]: [startTime, endTime]
        }
      },
      {
        end_time: {
          [Op.between]: [startTime, endTime]
        }
      },
      {
        [Op.and]: [
          { start_time: { [Op.lte]: startTime } },
          { end_time: { [Op.gte]: endTime } }
        ]
      }
    ]
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const conflictBooking = await this.findOne({ where });
  return conflictBooking !== null;
};

module.exports = CourseBooking; 