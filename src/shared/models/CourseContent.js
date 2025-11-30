const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 课程内容模型
 * 用于记录课程的上课内容（文字、图片、音频、视频）
 */
const CourseContent = sequelize.define('course_contents', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '课程内容ID'
  },
  course_type: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    comment: '课程类型：1-一对一课程，2-团课'
  },
  booking_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '一对一课程ID（course_type=1时必填）'
  },
  group_course_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '团课ID（course_type=2时必填）'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID（用于权限控制）'
  },
  text_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文本内容'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '图片URL数组，格式：["url1", "url2"]'
  },
  audios: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '音频数组，格式：[{"url": "audio_url", "duration": 60}]'
  },
  videos: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '视频数组，格式：[{"url": "video_url", "duration": 120}]'
  }
}, {
  tableName: 'course_contents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_booking_id',
      fields: ['booking_id']
    },
    {
      name: 'idx_group_course_id',
      fields: ['group_course_id']
    },
    {
      name: 'idx_coach_id',
      fields: ['coach_id']
    },
    {
      name: 'idx_course_type',
      fields: ['course_type']
    }
  ]
});

/**
 * 验证课程类型和ID的匹配性
 */
CourseContent.beforeValidate((courseContent) => {
  if (courseContent.course_type === 1 && !courseContent.booking_id) {
    throw new Error('一对一课程必须提供booking_id');
  }
  if (courseContent.course_type === 2 && !courseContent.group_course_id) {
    throw new Error('团课必须提供group_course_id');
  }
});

module.exports = CourseContent;

