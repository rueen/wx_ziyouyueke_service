const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');

// 引入所有模型
const User = require('./User');
const StudentCoachRelation = require('./StudentCoachRelation');
const TimeTemplate = require('./TimeTemplate');
const CourseBooking = require('./CourseBooking');
const Notification = require('./Notification');
const OperationLog = require('./OperationLog');
const Address = require('./Address');

/**
 * 设置模型关联关系
 */

// User 与 StudentCoachRelation 的关联
User.hasMany(StudentCoachRelation, { 
  foreignKey: 'student_id', 
  as: 'studentRelations',
  onDelete: 'CASCADE'
});

User.hasMany(StudentCoachRelation, { 
  foreignKey: 'coach_id', 
  as: 'coachRelations',
  onDelete: 'CASCADE'
});

StudentCoachRelation.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student' 
});

StudentCoachRelation.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// User 与 TimeTemplate 的关联
User.hasMany(TimeTemplate, { 
  foreignKey: 'coach_id', 
  as: 'timeTemplates',
  onDelete: 'CASCADE'
});

TimeTemplate.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// User 与 CourseBooking 的关联
User.hasMany(CourseBooking, { 
  foreignKey: 'student_id', 
  as: 'studentBookings'
});

User.hasMany(CourseBooking, { 
  foreignKey: 'coach_id', 
  as: 'coachBookings'
});

CourseBooking.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student' 
});

CourseBooking.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// StudentCoachRelation 与 CourseBooking 的关联
StudentCoachRelation.hasMany(CourseBooking, { 
  foreignKey: 'relation_id', 
  as: 'bookings'
});

CourseBooking.belongsTo(StudentCoachRelation, { 
  foreignKey: 'relation_id', 
  as: 'relation' 
});

// TimeTemplate 与 CourseBooking 的关联
TimeTemplate.hasMany(CourseBooking, { 
  foreignKey: 'template_id', 
  as: 'bookings'
});

CourseBooking.belongsTo(TimeTemplate, { 
  foreignKey: 'template_id', 
  as: 'template' 
});

// User 与 Notification 的关联
User.hasMany(Notification, { 
  foreignKey: 'user_id', 
  as: 'notifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

// User 与 OperationLog 的关联
User.hasMany(OperationLog, { 
  foreignKey: 'user_id', 
  as: 'operationLogs'
});

OperationLog.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

// User 与 Address 的关联
User.hasMany(Address, { 
  foreignKey: 'user_id', 
  as: 'addresses',
  onDelete: 'CASCADE'
});

Address.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

/**
 * 导出所有模型和Sequelize实例
 */
module.exports = {
  sequelize,
  Sequelize,
  User,
  StudentCoachRelation,
  TimeTemplate,
  CourseBooking,
  Notification,
  OperationLog,
  Address
}; 