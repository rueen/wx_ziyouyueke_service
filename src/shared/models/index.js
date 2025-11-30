const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');

// 引入所有模型
const User = require('./User');
const StudentCoachRelation = require('./StudentCoachRelation');
const TimeTemplate = require('./TimeTemplate');
const CourseBooking = require('./CourseBooking');
const OperationLog = require('./OperationLog');
const Address = require('./Address');
const Waiter = require('./Waiter');
const GroupCourse = require('./GroupCourse');
const GroupCourseRegistration = require('./GroupCourseRegistration');
const SubscribeMessageLog = require('./SubscribeMessageLog');
const UserSubscribeQuota = require('./UserSubscribeQuota');
const CoachCard = require('./CoachCard');
const StudentCardInstance = require('./StudentCardInstance');
const Donation = require('./Donation');
const CourseContent = require('./CourseContent');

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

// Address 与 CourseBooking 的关联
Address.hasMany(CourseBooking, { 
  foreignKey: 'address_id', 
  as: 'bookings'
});

CourseBooking.belongsTo(Address, { 
  foreignKey: 'address_id', 
  as: 'address' 
});

// User 与 GroupCourse 的关联
User.hasMany(GroupCourse, { 
  foreignKey: 'coach_id', 
  as: 'groupCourses'
});

GroupCourse.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// Address 与 GroupCourse 的关联
Address.hasMany(GroupCourse, { 
  foreignKey: 'address_id', 
  as: 'groupCourses'
});

GroupCourse.belongsTo(Address, { 
  foreignKey: 'address_id', 
  as: 'address' 
});

// GroupCourse 与 GroupCourseRegistration 的关联
GroupCourse.hasMany(GroupCourseRegistration, { 
  foreignKey: 'group_course_id', 
  as: 'registrations'
});

GroupCourseRegistration.belongsTo(GroupCourse, { 
  foreignKey: 'group_course_id', 
  as: 'groupCourse' 
});

// User 与 GroupCourseRegistration 的关联
User.hasMany(GroupCourseRegistration, { 
  foreignKey: 'student_id', 
  as: 'groupCourseRegistrations'
});

User.hasMany(GroupCourseRegistration, { 
  foreignKey: 'coach_id', 
  as: 'coachGroupRegistrations'
});

GroupCourseRegistration.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student' 
});

GroupCourseRegistration.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// StudentCoachRelation 与 GroupCourseRegistration 的关联
StudentCoachRelation.hasMany(GroupCourseRegistration, { 
  foreignKey: 'relation_id', 
  as: 'groupRegistrations'
});

GroupCourseRegistration.belongsTo(StudentCoachRelation, { 
  foreignKey: 'relation_id', 
  as: 'relation' 
});

// User 与 SubscribeMessageLog 的关联
User.hasMany(SubscribeMessageLog, { 
  foreignKey: 'receiver_user_id', 
  as: 'receivedMessages'
});

SubscribeMessageLog.belongsTo(User, { 
  foreignKey: 'receiver_user_id', 
  as: 'receiver' 
});

// User 与 UserSubscribeQuota 的关联
User.hasMany(UserSubscribeQuota, { 
  foreignKey: 'user_id', 
  as: 'subscribeQuotas'
});

UserSubscribeQuota.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

// CoachCard 与 User 的关联
User.hasMany(CoachCard, { 
  foreignKey: 'coach_id', 
  as: 'coachCards'
});

CoachCard.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// StudentCardInstance 与 CoachCard 的关联
CoachCard.hasMany(StudentCardInstance, { 
  foreignKey: 'coach_card_id', 
  as: 'instances'
});

StudentCardInstance.belongsTo(CoachCard, { 
  foreignKey: 'coach_card_id', 
  as: 'coachCard' 
});

// StudentCardInstance 与 User 的关联
User.hasMany(StudentCardInstance, { 
  foreignKey: 'student_id', 
  as: 'studentCardInstances'
});

User.hasMany(StudentCardInstance, { 
  foreignKey: 'coach_id', 
  as: 'coachCardInstances'
});

StudentCardInstance.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student' 
});

StudentCardInstance.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// StudentCardInstance 与 StudentCoachRelation 的关联
StudentCoachRelation.hasMany(StudentCardInstance, { 
  foreignKey: 'relation_id', 
  as: 'cardInstances'
});

StudentCardInstance.belongsTo(StudentCoachRelation, { 
  foreignKey: 'relation_id', 
  as: 'relation' 
});

// CourseBooking 与 StudentCardInstance 的关联
StudentCardInstance.hasMany(CourseBooking, { 
  foreignKey: 'card_instance_id', 
  as: 'bookings'
});

CourseBooking.belongsTo(StudentCardInstance, { 
  foreignKey: 'card_instance_id', 
  as: 'cardInstance' 
});

// User 与 Donation 的关联
User.hasMany(Donation, { 
  foreignKey: 'user_id', 
  as: 'donations'
});

Donation.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user' 
});

// CourseBooking 与 CourseContent 的关联
CourseBooking.hasOne(CourseContent, { 
  foreignKey: 'booking_id', 
  as: 'courseContent'
});

CourseContent.belongsTo(CourseBooking, { 
  foreignKey: 'booking_id', 
  as: 'booking' 
});

// GroupCourse 与 CourseContent 的关联
GroupCourse.hasOne(CourseContent, { 
  foreignKey: 'group_course_id', 
  as: 'courseContent'
});

CourseContent.belongsTo(GroupCourse, { 
  foreignKey: 'group_course_id', 
  as: 'groupCourse' 
});

// User 与 CourseContent 的关联（教练）
User.hasMany(CourseContent, { 
  foreignKey: 'coach_id', 
  as: 'courseContents'
});

CourseContent.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
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
  OperationLog,
  Address,
  Waiter,
  GroupCourse,
  GroupCourseRegistration,
  SubscribeMessageLog,
  UserSubscribeQuota,
  CoachCard,
  StudentCardInstance,
  Donation,
  CourseContent
}; 