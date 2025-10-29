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
  certification: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '专业认证（如：国际健身教练认证、瑜伽教练资格证等）'
  },
  motto: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '格言/座右铭'
  },
  poster_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '海报图片URL'
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
  },
  is_show: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否在教练大厅展示：0-否，1-是'
  },
  course_categories: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [{"id": 0, "name": "默认", "desc": "默认分类"}],
    comment: '课程分类配置，格式：[{"id":0, "name":"默认", "desc": "默认分类"}]'
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

/**
 * 实例方法：获取下一个分类ID
 */
User.prototype.getNextCategoryId = function() {
  const categories = this.course_categories || [];
  if (categories.length === 0) {
    return 0;
  }
  return Math.max(...categories.map(cat => cat.id)) + 1;
};

/**
 * 实例方法：添加课程分类
 */
User.prototype.addCourseCategory = function(name, desc) {
  const categories = [...(this.course_categories || [])];
  const newId = this.getNextCategoryId();
  
  // 检查分类名称是否已存在
  if (categories.some(cat => cat.name === name)) {
    throw new Error('分类名称已存在');
  }
  
  categories.push({
    id: newId,
    name: name,
    desc: desc || ''
  });
  
  return this.update({ course_categories: categories });
};

/**
 * 实例方法：更新课程分类
 */
User.prototype.updateCourseCategory = function(categoryId, name, desc) {
  const categories = [...(this.course_categories || [])];
  const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
  
  if (categoryIndex === -1) {
    throw new Error('分类不存在');
  }
  
  // 检查分类名称是否已存在（排除当前分类）
  if (categories.some((cat, index) => cat.name === name && index !== categoryIndex)) {
    throw new Error('分类名称已存在');
  }
  
  categories[categoryIndex] = {
    ...categories[categoryIndex],
    name: name,
    desc: desc || categories[categoryIndex].desc
  };
  
  return this.update({ course_categories: categories });
};

/**
 * 实例方法：删除课程分类
 */
User.prototype.deleteCourseCategory = function(categoryId) {
  // 不允许删除默认分类
  if (categoryId === 0) {
    throw new Error('不允许删除默认分类');
  }
  
  const categories = [...(this.course_categories || [])];
  const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
  
  if (categoryIndex === -1) {
    throw new Error('分类不存在');
  }
  
  categories.splice(categoryIndex, 1);
  
  return this.update({ course_categories: categories });
};

/**
 * 实例方法：获取课程分类
 */
User.prototype.getCourseCategory = function(categoryId) {
  const categories = this.course_categories || [];
  return categories.find(cat => cat.id === categoryId);
};

module.exports = User; 