const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 师生关系-标签关联表
 * 记录教练为某个师生关系（学员）打的标签
 */
const RelationTag = sequelize.define('relation_tags', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '主键'
  },
  relation_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '师生关系ID（FK → student_coach_relations.id）'
  },
  tag_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '标签ID（FK → coach_tags.id）'
  }
}, {
  tableName: 'relation_tags',
  comment: '师生关系标签关联表',
  indexes: [
    {
      unique: true,
      fields: ['relation_id', 'tag_id'],
      name: 'uk_relation_tag'
    }
  ]
});

module.exports = RelationTag;
