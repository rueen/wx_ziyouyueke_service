const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
 * 实例方法：获取指定分类的课时数
 */
StudentCoachRelation.prototype.getCategoryLessons = function(categoryId) {
  const lessons = this.lessons || [];
  const categoryLesson = lessons.find(lesson => lesson.category_id === categoryId);
  return categoryLesson ? categoryLesson.remaining_lessons : 0;
};

/**
 * 实例方法：减少指定分类的课时
 */
StudentCoachRelation.prototype.decreaseCategoryLessons = async function(categoryId, count = 1) {
  const lessons = [...(this.lessons || [])];
  const lessonIndex = lessons.findIndex(lesson => lesson.category_id === categoryId);
  
  if (lessonIndex === -1) {
    throw new Error(`分类ID ${categoryId} 不存在`);
  }
  
  if (lessons[lessonIndex].remaining_lessons < count) {
    throw new Error('该分类剩余课时不足');
  }
  
  lessons[lessonIndex].remaining_lessons -= count;
  
  // 更新数据库 - 强制标记JSON字段已更改
  this.lessons = lessons;
  this.changed('lessons', true); // 关键：强制告诉Sequelize此字段已更改
  this.last_course_time = new Date();
  
  return await this.save();
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
  // 1. 获取总剩余课时
  const totalLessons = this.getCategoryLessons(categoryId);
  
  // 2. 查询该师生关系下未完成的预约数量（占用的课时）
  // 使用 sequelize.models 来避免循环引用问题
  const CourseBooking = this.sequelize.models.course_bookings;
  const occupiedLessons = await CourseBooking.count({
    where: {
      relation_id: this.id,
      category_id: categoryId,
      booking_status: [1, 2], // 待确认、已确认的课程占用课时
    }
  });
  
  // 3. 可用课时 = 总课时 - 已占用课时
  return Math.max(totalLessons - occupiedLessons, 0);
};

module.exports = StudentCoachRelation; 