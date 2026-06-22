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
const Plan = require('./Plan');
const CancellationSetting = require('./CancellationSetting');
const BlockedSlot = require('./BlockedSlot');
const CoachSetting = require('./CoachSetting');
const CoachTag = require('./CoachTag');
const RelationTag = require('./RelationTag');
const TrainingRecordType = require('./TrainingRecordType');
const TrainingRecord = require('./TrainingRecord');
const LessonChangeLog = require('./LessonChangeLog');

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

// GroupCourseRegistration 与 StudentCardInstance 的关联
StudentCardInstance.hasMany(GroupCourseRegistration, {
  foreignKey: 'card_instance_id',
  as: 'groupCourseRegistrations'
});

GroupCourseRegistration.belongsTo(StudentCardInstance, {
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

// User 与 Plan 的关联
User.hasMany(Plan, { 
  foreignKey: 'student_id', 
  as: 'studentPlans'
});

User.hasMany(Plan, { 
  foreignKey: 'coach_id', 
  as: 'coachPlans'
});

Plan.belongsTo(User, { 
  foreignKey: 'student_id', 
  as: 'student' 
});

Plan.belongsTo(User, { 
  foreignKey: 'coach_id', 
  as: 'coach' 
});

// User 与 CancellationSetting 的关联
User.hasOne(CancellationSetting, {
  foreignKey: 'coach_id',
  as: 'cancellationSetting'
});

CancellationSetting.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// User 与 BlockedSlot 的关联
User.hasMany(BlockedSlot, {
  foreignKey: 'coach_id',
  as: 'blockedSlots',
  onDelete: 'CASCADE'
});

BlockedSlot.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// User 与 CoachSetting 的关联
User.hasOne(CoachSetting, {
  foreignKey: 'coach_id',
  as: 'coachSetting'
});

CoachSetting.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// User 与 CoachTag 的关联
User.hasMany(CoachTag, {
  foreignKey: 'coach_id',
  as: 'coachTags',
  onDelete: 'CASCADE'
});

CoachTag.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// StudentCoachRelation 与 CoachTag 的多对多关联（通过 RelationTag）
StudentCoachRelation.belongsToMany(CoachTag, {
  through: RelationTag,
  foreignKey: 'relation_id',
  otherKey: 'tag_id',
  as: 'tags'
});

CoachTag.belongsToMany(StudentCoachRelation, {
  through: RelationTag,
  foreignKey: 'tag_id',
  otherKey: 'relation_id',
  as: 'relations'
});

// RelationTag 直接关联
RelationTag.belongsTo(StudentCoachRelation, { foreignKey: 'relation_id', as: 'relation' });
RelationTag.belongsTo(CoachTag, { foreignKey: 'tag_id', as: 'tag' });

// User 与 TrainingRecordType 的关联（教练）
User.hasMany(TrainingRecordType, {
  foreignKey: 'coach_id',
  as: 'trainingRecordTypes',
  onDelete: 'CASCADE'
});

TrainingRecordType.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// TrainingRecordType 与 TrainingRecord 的关联
TrainingRecordType.hasMany(TrainingRecord, {
  foreignKey: 'type_id',
  as: 'trainingRecords'
});

TrainingRecord.belongsTo(TrainingRecordType, {
  foreignKey: 'type_id',
  as: 'trainingType'
});

// User 与 TrainingRecord 的关联（学员）
User.hasMany(TrainingRecord, {
  foreignKey: 'student_id',
  as: 'studentTrainingRecords'
});

TrainingRecord.belongsTo(User, {
  foreignKey: 'student_id',
  as: 'student'
});

// User 与 TrainingRecord 的关联（教练）
User.hasMany(TrainingRecord, {
  foreignKey: 'coach_id',
  as: 'coachTrainingRecords'
});

TrainingRecord.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

// LessonChangeLog 关联
StudentCoachRelation.hasMany(LessonChangeLog, {
  foreignKey: 'relation_id',
  as: 'lessonChangeLogs'
});

LessonChangeLog.belongsTo(StudentCoachRelation, {
  foreignKey: 'relation_id',
  as: 'relation'
});

User.hasMany(LessonChangeLog, {
  foreignKey: 'coach_id',
  as: 'coachLessonChangeLogs'
});

User.hasMany(LessonChangeLog, {
  foreignKey: 'student_id',
  as: 'studentLessonChangeLogs'
});

LessonChangeLog.belongsTo(User, {
  foreignKey: 'coach_id',
  as: 'coach'
});

LessonChangeLog.belongsTo(User, {
  foreignKey: 'student_id',
  as: 'student'
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
  CourseContent,
  Plan,
  CancellationSetting,
  BlockedSlot,
  CoachSetting,
  CoachTag,
  RelationTag,
  TrainingRecordType,
  TrainingRecord,
  LessonChangeLog
}; 