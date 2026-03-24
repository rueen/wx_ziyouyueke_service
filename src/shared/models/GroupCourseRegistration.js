const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 团课报名模型
 */
const GroupCourseRegistration = sequelize.define('group_course_registrations', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '报名ID'
  },
  group_course_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '团课ID'
  },
  student_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '学员ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID（冗余字段，便于查询）'
  },
  relation_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '师生关系ID（仅学员报名时有值，enrollment_scope=1时必填）'
  },
  
  // 报名状态
  registration_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '报名状态：1-已报名，2-已取消'
  },
  
  // 支付信息
  payment_type: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    comment: '支付方式：1-课时，2-金额，3-免费，4-课程卡'
  },
  card_instance_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '课程卡实例ID（payment_type=4时有值，关联student_card_instances表）'
  },
  lesson_deducted: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: '已扣除的课时数（签到时扣除）'
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: '支付金额（前期仅记录，不实际支付）'
  },
  payment_status: {
    type: DataTypes.TINYINT(1),
    allowNull: true,
    defaultValue: 0,
    comment: '支付状态：0-待支付（报名阶段），1-已支付（签到后），2-已退款'
  },
  
  // 签到相关（签到即完成）
  check_in_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '签到状态：0-未签到，1-已签到，2-缺席'
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '签到时间'
  },
  checked_in_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '签到操作人ID（教练ID或学员ID）'
  },
  
  // 时间管理
  registered_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '报名时间'
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
  cancelled_by: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '取消操作人ID'
  }
}, {
  tableName: 'group_course_registrations',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['group_course_id', 'student_id'], unique: true },
    { fields: ['student_id'] },
    { fields: ['coach_id'] },
    { fields: ['relation_id'] },
    { fields: ['registration_status'] },
    { fields: ['check_in_status'] },
    { fields: ['payment_type'] },
    { fields: ['student_id', 'registration_status'] },
    { fields: ['group_course_id', 'registration_status'] },
    { fields: ['coach_id', 'registration_status'] }
  ]
});

/**
 * 实例方法：取消报名（简化版本）
 */

/**
 * 实例方法：取消报名
 */
GroupCourseRegistration.prototype.cancel = async function(reason, operatorId) {
  const transaction = await sequelize.transaction();
  
  try {
    // 1. 更新报名状态
    this.registration_status = 2; // 已取消
    this.cancelled_at = new Date();
    this.cancel_reason = reason;
    this.cancelled_by = operatorId;
    await this.save({ transaction });
    
    // 2. 减少团课参与人数（如果之前已报名）
    if (this.registration_status === 1) {
      const GroupCourse = this.sequelize.models.group_courses;
      const groupCourse = await GroupCourse.findByPk(this.group_course_id);
      if (groupCourse) {
        await groupCourse.decreaseParticipants(1, { transaction });
      }
    }
    
    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * 实例方法：签到
 */
GroupCourseRegistration.prototype.checkIn = async function(operatorId) {
  const transaction = await sequelize.transaction();
  
  try {
    // 扣课时：price_type=1，且有师生关系
    if (this.payment_type === 1 && this.relation_id) {
      const StudentCoachRelation = this.sequelize.models.student_coach_relations;
      const GroupCourse = this.sequelize.models.group_courses;
      
      const relation = await StudentCoachRelation.findByPk(this.relation_id);
      const course = await GroupCourse.findByPk(this.group_course_id);
      
      if (relation && course) {
        await relation.decreaseCategoryLessons(course.category_id, course.lesson_cost, { transaction });
        this.lesson_deducted = course.lesson_cost;
        this.payment_status = 1;
      }
    }

    // 扣课程卡：price_type=4，且有 card_instance_id
    if (this.payment_type === 4 && this.card_instance_id) {
      const StudentCardInstance = this.sequelize.models.student_card_instances;
      const GroupCourse = this.sequelize.models.group_courses;

      const cardInstance = await StudentCardInstance.findByPk(this.card_instance_id);
      const course = await GroupCourse.findByPk(this.group_course_id);

      if (cardInstance && course) {
        const lessonCost = course.lesson_cost || 1;

        // 未开卡时自动开卡
        if (cardInstance.card_status === 0) {
          await cardInstance.activate(transaction);
        }

        // 检查卡片是否可用
        const checkResult = cardInstance.checkAvailable();
        if (!checkResult.available) {
          throw new Error(`课程卡不可用：${checkResult.reason}`);
        }

        // 检查并扣除课时
        if (cardInstance.total_lessons !== null) {
          if ((cardInstance.remaining_lessons || 0) < lessonCost) {
            throw new Error('课程卡课时不足，无法完成签到');
          }
          cardInstance.remaining_lessons -= lessonCost;
        }
        cardInstance.used_count = (cardInstance.used_count || 0) + lessonCost;
        await cardInstance.save({ transaction });

        this.lesson_deducted = lessonCost;
        this.payment_status = 1;
      }
    }
    
    // 更新签到状态（签到即完成，报名状态保持为已报名）
    this.check_in_status = 1;
    this.check_in_time = new Date();
    this.checked_in_by = operatorId;
    
    await this.save({ transaction });
    await transaction.commit();
    
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * 实例方法：标记缺席
 */
GroupCourseRegistration.prototype.markAbsent = async function() {
  this.check_in_status = 2; // 缺席
  return await this.save();
};

/**
 * 实例方法：获取报名状态文本
 */
GroupCourseRegistration.prototype.getRegistrationStatusText = function() {
  const statusMap = {
    1: '待确认',
    2: '已确认',
    3: '已完成',
    4: '已取消',
    5: '已拒绝'
  };
  return statusMap[this.registration_status] || '未知状态';
};

/**
 * 实例方法：获取签到状态文本
 */
GroupCourseRegistration.prototype.getCheckInStatusText = function() {
  const statusMap = {
    0: '未签到',
    1: '已签到',
    2: '缺席'
  };
  return statusMap[this.check_in_status] || '未知状态';
};

module.exports = GroupCourseRegistration;
