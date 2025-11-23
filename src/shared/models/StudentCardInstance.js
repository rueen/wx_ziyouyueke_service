const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment-timezone');

/**
 * 学员卡片实例模型
 */
const StudentCardInstance = sequelize.define('student_card_instances', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '卡片实例ID'
  },
  coach_card_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '卡片模板ID'
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
    comment: '师生关系ID'
  },
  total_lessons: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '总课时数（从模板复制，NULL表示无限次数）'
  },
  remaining_lessons: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '剩余课时数（NULL表示无限次数）'
  },
  used_count: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '已使用次数'
  },
  expire_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '有效期截止日期（开卡时才设置）'
  },
  valid_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '有效天数（从模板复制）'
  },
  card_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '状态：0-未开启，1-已开启，2-已停用，3-已过期'
  },
  activated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开卡时间'
  },
  deactivated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '停卡时间'
  },
  remaining_valid_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '停卡时的剩余有效天数'
  }
}, {
  tableName: 'student_card_instances',
  comment: '学员卡片实例表',
  indexes: [
    {
      fields: ['coach_card_id'],
      name: 'idx_coach_card_id'
    },
    {
      fields: ['student_id', 'coach_id'],
      name: 'idx_student_coach'
    },
    {
      fields: ['relation_id'],
      name: 'idx_relation_id'
    },
    {
      fields: ['card_status'],
      name: 'idx_card_status'
    },
    {
      fields: ['expire_date'],
      name: 'idx_expire_date'
    }
  ]
});

/**
 * 实例方法：检查卡片是否可用
 * @returns {Object} { available: boolean, reason: string }
 */
StudentCardInstance.prototype.checkAvailable = function() {
  if (this.card_status !== 1) {
    const statusMap = {
      0: '卡片未开启',
      2: '卡片已停用',
      3: '卡片已过期'
    };
    return { 
      available: false, 
      reason: statusMap[this.card_status] || '卡片状态异常' 
    };
  }

  // 检查是否已过期（如果有到期日期）
  if (this.expire_date) {
    const now = moment.tz('Asia/Shanghai').startOf('day');
    const expireDate = moment.tz(this.expire_date, 'Asia/Shanghai').endOf('day');
    
    if (now.isAfter(expireDate)) {
      return { 
        available: false, 
        reason: '卡片已过期' 
      };
    }
  }

  if (this.total_lessons !== null && this.remaining_lessons <= 0) {
    return { 
      available: false, 
      reason: '卡片课时已用完' 
    };
  }

  return { available: true, reason: '' };
};

/**
 * 实例方法：开卡
 */
StudentCardInstance.prototype.activate = async function() {
  if (this.card_status === 1) {
    throw new Error('卡片已开启，无需重复操作');
  }

  const now = moment.tz('Asia/Shanghai');
  
  // 如果是首次开卡（expire_date 为 null），计算到期日期
  let expireDate = this.expire_date;
  if (!expireDate) {
    expireDate = now.clone().add(this.valid_days, 'days').format('YYYY-MM-DD');
  } else {
    // 如果之前已开过卡，检查是否已过期
    const expireEndTime = moment.tz(expireDate, 'Asia/Shanghai').endOf('day');
    if (now.isAfter(expireEndTime)) {
      throw new Error('卡片已过期，无法开启');
    }
  }

  return await this.update({
    card_status: 1,
    activated_at: new Date(),
    expire_date: expireDate
  });
};

/**
 * 实例方法：停卡
 */
StudentCardInstance.prototype.deactivate = async function() {
  if (this.card_status !== 1) {
    throw new Error('只有已开启的卡片才能停用');
  }

  const now = moment.tz('Asia/Shanghai');
  
  // 计算剩余有效天数
  let remainingDays = 0;
  if (this.expire_date) {
    const expireEndTime = moment.tz(this.expire_date, 'Asia/Shanghai').endOf('day');
    remainingDays = expireEndTime.diff(now.startOf('day'), 'days');
    if (remainingDays < 0) remainingDays = 0;
  }

  return await this.update({
    card_status: 2,
    deactivated_at: new Date(),
    remaining_valid_days: remainingDays // 记录剩余有效天数
  });
};

/**
 * 实例方法：重新开启
 */
StudentCardInstance.prototype.reactivate = async function() {
  if (this.card_status !== 2) {
    throw new Error('只有已停用的卡片才能重新开启');
  }

  const now = moment.tz('Asia/Shanghai');
  
  // 使用停卡时记录的剩余有效天数，计算新的到期日期
  let newExpireDate = this.expire_date;
  if (this.remaining_valid_days !== null && this.remaining_valid_days !== undefined) {
    newExpireDate = now.clone().add(this.remaining_valid_days, 'days').format('YYYY-MM-DD');
  } else if (this.expire_date) {
    // 如果没有记录剩余天数（旧数据），检查是否已过期
    const expireEndTime = moment.tz(this.expire_date, 'Asia/Shanghai').endOf('day');
    if (now.isAfter(expireEndTime)) {
      throw new Error('卡片已过期，无法开启');
    }
  }

  return await this.update({
    card_status: 1,
    activated_at: new Date(),
    expire_date: newExpireDate,
    deactivated_at: null,
    remaining_valid_days: null // 清空剩余天数记录
  });
};

/**
 * 实例方法:扣除课时
 * @param {Object} transaction - 事务对象
 */
StudentCardInstance.prototype.deductLesson = async function(transaction = null) {
  const checkResult = this.checkAvailable();
  if (!checkResult.available) {
    throw new Error(checkResult.reason);
  }

  // 无限次数卡片只增加使用次数
  if (this.total_lessons === null) {
    this.used_count += 1;
  } else {
    if (this.remaining_lessons <= 0) {
      throw new Error('卡片课时不足');
    }
    this.remaining_lessons -= 1;
    this.used_count += 1;
  }

  return await this.save({ transaction });
};

/**
 * 实例方法：检查是否可以删除
 * @returns {Promise<Object>} { canDelete: boolean, reason: string }
 */
StudentCardInstance.prototype.canDelete = async function() {
  // 如果有到期日期，检查是否已过期
  if (this.expire_date) {
    const now = moment.tz('Asia/Shanghai').startOf('day');
    const expireDate = moment.tz(this.expire_date, 'Asia/Shanghai').endOf('day');
    
    // 已过期的卡片可以删除
    if (now.isAfter(expireDate)) {
      return { canDelete: true, reason: '' };
    }
    
    // 有效期内，检查是否有剩余课时
    const hasRemainingLessons = this.total_lessons === null || this.remaining_lessons > 0;
    
    if (!hasRemainingLessons) {
      return { canDelete: true, reason: '' };
    }

    // 有效期内且有剩余课时，检查是否有使用记录
    const CourseBooking = this.sequelize.models.course_bookings;
    const usageCount = await CourseBooking.count({
      where: {
        card_instance_id: this.id
      }
    });

    if (usageCount > 0) {
      return { 
        canDelete: false, 
        reason: '有效期内且有剩余课时且存在使用记录，不允许删除' 
      };
    }
  } else {
    // 未开卡的卡片（没有到期日期），检查是否有使用记录
    const CourseBooking = this.sequelize.models.course_bookings;
    const usageCount = await CourseBooking.count({
      where: {
        card_instance_id: this.id
      }
    });

    if (usageCount > 0) {
      return { 
        canDelete: false, 
        reason: '存在使用记录，不允许删除' 
      };
    }
  }

  return { canDelete: true, reason: '' };
};

/**
 * 实例方法：获取卡片信息摘要
 */
StudentCardInstance.prototype.getSummary = async function() {
  let isExpired = false;
  
  // 只有开过卡才会有到期日期
  if (this.expire_date) {
    const now = moment.tz('Asia/Shanghai').startOf('day');
    const expireDate = moment.tz(this.expire_date, 'Asia/Shanghai').endOf('day');
    isExpired = now.isAfter(expireDate);
  }

  // 获取卡片模板信息（包括已软删除的）
  const CoachCard = this.sequelize.models.coach_cards;
  const template = await CoachCard.findByPk(this.coach_card_id, {
    paranoid: false // 包括软删除的记录
  });

  return {
    id: this.id,
    coach_card_id: this.coach_card_id,
    card_name: template ? template.card_name : '未知卡片',
    card_color: template ? template.card_color : '#999999',
    total_lessons: this.total_lessons,
    remaining_lessons: this.remaining_lessons,
    used_count: this.used_count,
    valid_days: this.valid_days,
    expire_date: this.expire_date,
    card_status: this.card_status,
    card_status_text: this.getStatusText(),
    is_expired: isExpired,
    is_unlimited: this.total_lessons === null,
    activated_at: this.activated_at,
    deactivated_at: this.deactivated_at,
    template: template ? template.getSummary() : null
  };
};

/**
 * 实例方法：获取状态文本
 */
StudentCardInstance.prototype.getStatusText = function() {
  const statusMap = {
    0: '未开启',
    1: '已开启',
    2: '已停用',
    3: '已过期'
  };
  return statusMap[this.card_status] || '未知状态';
};

/**
 * 类方法：从模板创建实例
 * @param {Object} coachCard - 卡片模板对象
 * @param {number} studentId - 学员ID
 * @param {number} coachId - 教练ID
 * @param {number} relationId - 师生关系ID
 * @returns {Promise<StudentCardInstance>} 卡片实例
 */
StudentCardInstance.createFromTemplate = async function(coachCard, studentId, coachId, relationId) {
  return await this.create({
    coach_card_id: coachCard.id,
    student_id: studentId,
    coach_id: coachId,
    relation_id: relationId,
    total_lessons: coachCard.card_lessons, // 直接使用模板的课时数
    remaining_lessons: coachCard.card_lessons,
    valid_days: coachCard.valid_days, // 保存有效天数
    expire_date: null, // 开卡时才计算到期日期
    card_status: 0, // 默认未开启
    used_count: 0
  });
};

/**
 * 类方法：自动标记过期卡片
 */
StudentCardInstance.autoMarkExpired = async function() {
  const now = moment.tz('Asia/Shanghai').startOf('day').format('YYYY-MM-DD');
  
  const [affectedCount] = await this.update(
    { card_status: 3 },
    {
      where: {
        card_status: 1, // 只更新已开启的卡片
        expire_date: {
          [sequelize.Sequelize.Op.lt]: now
        }
      }
    }
  );

  return affectedCount;
};

module.exports = StudentCardInstance;

