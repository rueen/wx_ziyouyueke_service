/*
 * @Author: diaochan
 * @Date: 2025-06-02 15:12:19
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-06 20:27:44
 * @Description: 
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 用户模型
 */
const User = sequelize.define('users', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户ID'
  },
  openid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '微信openid'
  },
  unionid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '微信unionid'
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '用户昵称'
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '头像URL'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: '手机号'
  },
  gender: {
    type: DataTypes.TINYINT(1),
    allowNull: true,
    comment: '性别：0-未知，1-男，2-女'
  },
  intro: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '个人介绍'
  },
  register_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '注册时间'
  },
  last_login_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '账户状态：0-禁用，1-正常'
  }
}, {
  tableName: 'users',
  comment: '用户表',
  indexes: [
    {
      unique: true,
      fields: ['openid'],
      name: 'uk_openid'
    },
    {
      unique: true,
      fields: ['phone'],
      name: 'uk_phone'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    }
  ]
});



/**
 * 实例方法：更新最后登录时间
 */
User.prototype.updateLastLoginTime = function() {
  return this.update({ last_login_time: new Date() });
};

module.exports = User; 