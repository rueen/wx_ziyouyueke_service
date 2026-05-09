const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 教练标签模型
 * 每位教练可创建多个标签，用于对学员进行分类管理
 */
const CoachTag = sequelize.define('coach_tags', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID（FK → users.id）'
  },
  name: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: '标签名称'
  }
}, {
  tableName: 'coach_tags',
  comment: '教练标签表',
  indexes: [
    {
      unique: true,
      fields: ['coach_id', 'name'],
      name: 'uk_coach_tag_name'
    }
  ]
});

module.exports = CoachTag;
