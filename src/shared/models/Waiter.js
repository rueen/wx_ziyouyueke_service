const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * 管理员模型
 */
const Waiter = sequelize.define('waiters', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '管理员ID'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码哈希'
  },
  status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '状态：0-禁用，1-正常'
  },
  last_login_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  }
}, {
  tableName: 'waiters',
  comment: '管理员表',
  indexes: [
    {
      unique: true,
      fields: ['username'],
      name: 'uk_waiters_username'
    },
    {
      fields: ['status'],
      name: 'idx_status'
    }
  ]
});

/**
 * Hook：密码加密
 */
Waiter.beforeCreate(async (waiter, options) => {
  if (waiter.password) {
    const salt = await bcrypt.genSalt(10);
    waiter.password = await bcrypt.hash(waiter.password, salt);
  }
});

Waiter.beforeUpdate(async (waiter, options) => {
  if (waiter.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    waiter.password = await bcrypt.hash(waiter.password, salt);
  }
});

/**
 * 实例方法：验证密码
 */
Waiter.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * 实例方法：更新最后登录时间
 */
Waiter.prototype.updateLastLoginTime = function() {
  return this.update({ last_login_time: new Date() });
};

/**
 * 类方法：创建默认管理员账号
 */
Waiter.createDefaultAdmin = async function() {
  try {
    // 检查是否已存在管理员账号
    const existingAdmin = await this.findOne({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      await this.create({
        username: 'admin',
        password: 'lucky123',
        status: 1
      });
      console.log('默认管理员账号创建成功: admin / lucky123');
    } else {
      console.log('默认管理员账号已存在');
    }
  } catch (error) {
    console.error('创建默认管理员账号失败:', error);
  }
};

module.exports = Waiter;
