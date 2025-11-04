const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 团课模型
 */
const GroupCourse = sequelize.define('group_courses', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '团课ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID'
  },
  category_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '课程分类ID（对应教练的course_categories）'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '团课标题'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: '团课活动详情（支持富文本格式）'
  },
  cover_images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '封面图片数组，格式：["url1", "url2"]'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '活动详情图片数组，格式：["url1", "url2"]'
  },
  
  // 时间相关
  course_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '上课日期（YYYY-MM-DD）'
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
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '课程时长（分钟）'
  },
  
  // 地点相关
  address_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '地址ID（关联addresses表）'
  },
  
  // 容量管理
  max_participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    comment: '最大参与人数'
  },
  min_participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '最小开课人数'
  },
  current_participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '当前报名人数'
  },
  
  // 费用相关
  price_type: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '收费方式：1-扣课时，2-金额展示（暂不真实支付），3-免费'
  },
  lesson_cost: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: '扣除课时数（price_type=1时有效）'
  },
  price_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: '费用金额（前期仅记录，不实际支付）'
  },
  
  // 报名设置
  enrollment_scope: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '报名范围：1-仅学员可报名，2-所有人可报名'
  },
  
  // 展示设置
  is_show: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否在活动大厅展示：0-否，1-是'
  },
  
  // 状态管理
  status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '课程状态：0-待发布，1-报名中，2-已结束（已取消、人数不足取消、已完成等）'
  },
  
  // 时间戳
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancel_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '取消原因'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  }
}, {
  tableName: 'group_courses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['coach_id'] },
    { fields: ['category_id'] },
    { fields: ['course_date'] },
    { fields: ['status'] },
    { fields: ['enrollment_scope'] },
    { fields: ['coach_id', 'status'] },
    { fields: ['course_date', 'status'] },
    { fields: ['enrollment_scope', 'status'] },
    { fields: ['address_id'] }
  ]
});

/**
 * 实例方法：检查是否可以报名
 */
GroupCourse.prototype.canEnroll = function() {
  return this.status === 1 && // 报名中
         this.current_participants < this.max_participants;
};

/**
 * 实例方法：增加参与人数
 */
GroupCourse.prototype.increaseParticipants = async function(count = 1) {
  this.current_participants += count;
  return await this.save();
};

/**
 * 实例方法：减少参与人数
 */
GroupCourse.prototype.decreaseParticipants = async function(count = 1) {
  this.current_participants = Math.max(this.current_participants - count, 0);
  return await this.save();
};

/**
 * 实例方法：完成团课
 */
GroupCourse.prototype.completeCourse = async function() {
  this.status = 2; // 已结束
  this.completed_at = new Date();
  return await this.save();
};

/**
 * 实例方法：取消团课
 */
GroupCourse.prototype.cancelCourse = async function(reason) {
  this.status = 2; // 已结束
  this.cancelled_at = new Date();
  this.cancel_reason = reason;
  return await this.save();
};

/**
 * 实例方法：获取状态文本
 */
GroupCourse.prototype.getStatusText = function() {
  const statusMap = {
    0: '待发布',
    1: '报名中',
    2: '已结束'
  };
  return statusMap[this.status] || '未知状态';
};

/**
 * 实例方法：获取报名状态文本（基于课程状态和人数）
 */
GroupCourse.prototype.getEnrollmentStatusText = function() {
  if (this.status === 0) {
    return '待发布';
  }
  if (this.status !== 1) {
    return '已结束';
  }
  return this.current_participants >= this.max_participants ? '已满员' : '可报名';
};

/**
 * 实例方法：获取结束原因
 */
GroupCourse.prototype.getEndReason = function() {
  if (this.status !== 2) {
    return null; // 未结束状态不返回结束原因
  }
  
  if (this.cancel_reason) {
    return this.cancel_reason;
  } else if (this.completed_at) {
    return '课程已完成';
  } else if (this.current_participants < this.min_participants) {
    return '人数不足取消';
  } else {
    return '已取消';
  }
};

/**
 * 类方法：自动取消人数不足的团课
 * 检查所有报名中状态、开始时间在1小时内的团课，如果报名人数低于最小开课人数则自动取消
 */
GroupCourse.autoCancelInsufficientParticipants = async function() {
  const { Op } = require('sequelize');
  const now = new Date();
  const checkTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1小时后
  
  try {
    // 查询所有报名中的团课
    const courses = await this.findAll({
      where: {
        status: 1 // 报名中
      }
    });

    let cancelledCount = 0;

    for (const course of courses) {
      // 检查人数是否不足
      if (course.current_participants < course.min_participants) {
        // 构建团课开始时间
        const courseStartTime = new Date(`${course.course_date}T${course.start_time}`);
        
        // 检查是否在1小时内开始（已开始的不处理，只处理未来1小时内的）
        if (courseStartTime > now && courseStartTime <= checkTime) {
          await course.cancelCourse('人数不足取消');
          cancelledCount++;
        }
      }
    }

    if (cancelledCount > 0) {
      console.log(`自动取消了 ${cancelledCount} 个人数不足的团课`);
    }

    return {
      success: true,
      cancelledCount: cancelledCount,
      message: `成功自动取消 ${cancelledCount} 个人数不足的团课`
    };

  } catch (error) {
    console.error('自动取消人数不足团课失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = GroupCourse;
