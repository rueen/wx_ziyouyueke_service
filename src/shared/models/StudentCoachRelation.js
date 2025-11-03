const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment-timezone');

/**
 * 学员教练关系模型
 */
const StudentCoachRelation = sequelize.define('student_coach_relations', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
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
  student_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '学员姓名（教练可维护）'
  },
  lessons: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [{"category_id": 0, "remaining_lessons": 0}],
    comment: '按分类的课时数，格式：[{"category_id":0, "remaining_lessons": 0}]'
  },
  coach_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '教练备注'
  },
  student_remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '学员备注'
  },
  relation_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '关系状态：0-已解除，1-正常'
  },
  bind_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '绑定时间'
  },
  last_course_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后上课时间'
  }
}, {
  tableName: 'student_coach_relations',
  comment: '学员教练关系表',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'coach_id'],
      name: 'uk_student_coach'
    },
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      fields: ['relation_status'],
      name: 'idx_relation_status'
    }
  ]
});


/**
 * 实例方法：获取指定分类的剩余课时（含过期检查）
 * @param {number} categoryId - 分类ID
 * @returns {Promise<number>} 剩余课时数
 */
StudentCoachRelation.prototype.getCategoryLessons = async function(categoryId) {
  const lessons = this.lessons || [];
  const category = lessons.find(l => l.category_id === categoryId);
  
  if (!category) return 0;
  
  // 已清零，直接返回
  if (category.is_cleared) return 0;
  
  // 检查是否过期
  if (category.expire_date) {
    const expireEndTime = moment.tz(category.expire_date, 'Asia/Shanghai').endOf('day');
    const now = moment.tz('Asia/Shanghai');
    
    if (now.isAfter(expireEndTime)) {
      // 记录清零前的课时数
      const clearedLessons = category.remaining_lessons;
      
      // 清零课时并标记（original_lessons 只在清零时设置一次）
      category.original_lessons = clearedLessons;
      category.remaining_lessons = 0;
      category.is_cleared = true;
      
      this.changed('lessons', true);
      await this.save();
      
      // 记录操作日志
      const OperationLog = this.sequelize.models.operation_logs;
      await OperationLog.create({
        user_id: this.student_id,
        operation_type: 'lesson_expire',
        operation_desc: `课时过期自动清零: 分类${categoryId}清零${clearedLessons}节课`,
        table_name: 'student_coach_relations',
        record_id: this.id,
        old_data: {
          category_id: categoryId,
          remaining_lessons: clearedLessons,
          expire_date: category.expire_date
        },
        new_data: {
          category_id: categoryId,
          remaining_lessons: 0,
          expire_date: category.expire_date,
          is_cleared: true,
          coach_id: this.coach_id
        },
        ip_address: null,
        user_agent: 'System-Auto'
      });
      
      return 0;
    }
  }
  
  return category.remaining_lessons || 0;
};

/**
 * 实例方法：扣减指定分类的课时
 * @param {number} categoryId - 分类ID
 * @param {number} count - 扣减数量
 * @param {Object} transaction - 数据库事务对象（可选）
 * @returns {Promise<boolean>} 是否扣减成功
 */
StudentCoachRelation.prototype.decreaseCategoryLessons = async function(categoryId, count = 1, transaction = null) {
  // 先检查有效课时（含过期检查）
  const availableLessons = await this.getCategoryLessons(categoryId);
  
  if (availableLessons < count) {
    throw new Error('该分类剩余课时不足或已过期');
  }
  
  const lessons = [...(this.lessons || [])];
  const lessonIndex = lessons.findIndex(lesson => lesson.category_id === categoryId);
  
  if (lessonIndex === -1) {
    throw new Error(`分类ID ${categoryId} 不存在`);
  }
  
  lessons[lessonIndex].remaining_lessons -= count;
  
  // 更新数据库 - 强制标记JSON字段已更改
  this.lessons = lessons;
  this.changed('lessons', true);
  this.last_course_time = new Date();
  
  await this.save({ transaction });
  
  return true;
};

/**
 * 实例方法：增加指定分类的课时
 */
StudentCoachRelation.prototype.increaseCategoryLessons = async function(categoryId, count = 1) {
  const lessons = [...(this.lessons || [])];
  const lessonIndex = lessons.findIndex(lesson => lesson.category_id === categoryId);
  
  if (lessonIndex === -1) {
    // 如果分类不存在，创建新的分类课时记录
    lessons.push({
      category_id: categoryId,
      remaining_lessons: count
    });
  } else {
    lessons[lessonIndex].remaining_lessons += count;
  }
  
  // 更新数据库 - 强制标记JSON字段已更改
  this.lessons = lessons;
  this.changed('lessons', true); // 关键：强制告诉Sequelize此字段已更改
  
  return await this.save();
};

/**
 * 实例方法：添加新的分类课时项
 */
StudentCoachRelation.prototype.addCategoryLesson = async function(categoryId) {
  const lessons = [...(this.lessons || [])];
  
  // 检查分类是否已存在
  if (lessons.some(lesson => lesson.category_id === categoryId)) {
    return this; // 分类已存在，不需要添加
  }
  
  lessons.push({
    category_id: categoryId,
    remaining_lessons: 0
  });
  
  // 更新数据库 - 强制标记JSON字段已更改
  this.lessons = lessons;
  this.changed('lessons', true);
  
  return await this.save();
};

/**
 * 实例方法：删除指定分类的课时项
 */
StudentCoachRelation.prototype.removeCategoryLesson = async function(categoryId) {
  // 不允许删除默认分类
  if (categoryId === 0) {
    throw new Error('不允许删除默认分类');
  }
  
  const lessons = [...(this.lessons || [])];
  const lessonIndex = lessons.findIndex(lesson => lesson.category_id === categoryId);
  
  if (lessonIndex === -1) {
    return this; // 分类不存在，不需要删除
  }
  
  // 检查该分类是否还有剩余课时
  if (lessons[lessonIndex].remaining_lessons > 0) {
    throw new Error('该分类还有剩余课时，不允许删除');
  }
  
  lessons.splice(lessonIndex, 1);
  
  // 更新数据库 - 强制标记JSON字段已更改
  this.lessons = lessons;
  this.changed('lessons', true);
  
  return await this.save();
};

/**
 * 实例方法：获取所有分类的课时信息
 */
StudentCoachRelation.prototype.getAllCategoryLessons = function() {
  return this.lessons || [];
};

/**
 * 实例方法：获取指定分类的可用课时（总课时 - 未完成预约占用的课时）
 * @param {number} categoryId 课程分类ID
 * @returns {Promise<number>} 可用课时数
 */
StudentCoachRelation.prototype.getAvailableLessons = async function(categoryId) {
  // 1. 获取总剩余课时（含过期检查）
  const totalLessons = await this.getCategoryLessons(categoryId);
  
  // 2. 并行查询常规课和团课占用的课时
  const [regularOccupied, groupOccupied] = await Promise.all([
    this.getRegularCourseOccupied(categoryId),
    this.getGroupCourseOccupied(categoryId)
  ]);
  
  // 3. 可用课时 = 总课时 - 已占用课时（常规课 + 团课）
  const totalOccupied = regularOccupied + groupOccupied;
  return Math.max(totalLessons - totalOccupied, 0);
};

/**
 * 实例方法：获取常规课占用的课时数
 * @param {number} categoryId 课程分类ID
 * @returns {Promise<number>} 占用的课时数
 */
StudentCoachRelation.prototype.getRegularCourseOccupied = async function(categoryId) {
  // 使用 sequelize.models 来避免循环引用问题
  const CourseBooking = this.sequelize.models.course_bookings;
  return await CourseBooking.count({
    where: {
      relation_id: this.id,
      category_id: categoryId,
      booking_status: [1, 2], // 待确认、已确认的课程占用课时
    }
  });
};

/**
 * 实例方法：获取团课占用的课时数
 * @param {number} categoryId 课程分类ID
 * @returns {Promise<number>} 占用的课时数
 */
StudentCoachRelation.prototype.getGroupCourseOccupied = async function(categoryId) {
  const GroupCourseRegistration = this.sequelize.models.group_course_registrations;
  const GroupCourse = this.sequelize.models.group_courses;
  
  const registrations = await GroupCourseRegistration.findAll({
    where: {
      relation_id: this.id,           // 通过 relation_id 关联
      registration_status: 1,          // 只统计已报名的记录
      payment_type: 1                 // 只统计扣课时的团课
    },
    include: [{
      model: GroupCourse,
      as: 'groupCourse',
      where: {
        category_id: categoryId,
        status: 1  // 只统计报名中的团课
      },
      attributes: ['lesson_cost']
    }]
  });
  
  // 计算总占用课时数（团课可能一次扣多节）
  return registrations.reduce((total, reg) => {
    return total + (reg.groupCourse?.lesson_cost || 1);
  }, 0);
};

module.exports = StudentCoachRelation; 