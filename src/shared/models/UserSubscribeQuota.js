const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 用户订阅消息配额模型
 */
const UserSubscribeQuota = sequelize.define('user_subscribe_quotas', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '记录ID'
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '用户ID'
  },
  template_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模板类型：BOOKING_CONFIRM, BOOKING_SUCCESS 等'
  },
  template_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '微信模板ID'
  },
  remaining_quota: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '剩余可发送次数'
  },
  total_quota: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '总授权次数（累计）'
  },
  last_authorized_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最近一次授权时间'
  },
  last_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最近一次发送时间'
  }
}, {
  tableName: 'user_subscribe_quotas',
  comment: '用户订阅消息配额表',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'template_type'],
      name: 'uk_user_template'
    },
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    },
    {
      fields: ['template_type'],
      name: 'idx_template_type'
    },
    {
      fields: ['remaining_quota'],
      name: 'idx_remaining_quota'
    }
  ]
});

/**
 * 类方法：获取或创建用户的模板配额记录
 * @param {number} userId - 用户ID
 * @param {string} templateType - 模板类型
 * @param {string} templateId - 模板ID
 * @returns {Promise<UserSubscribeQuota>} 配额记录
 */
UserSubscribeQuota.getOrCreate = async function(userId, templateType, templateId) {
  const [quota, created] = await this.findOrCreate({
    where: {
      user_id: userId,
      template_type: templateType
    },
    defaults: {
      user_id: userId,
      template_type: templateType,
      template_id: templateId,
      remaining_quota: 0,
      total_quota: 0
    }
  });
  
  return quota;
};

/**
 * 类方法：增加用户的订阅配额
 * @param {number} userId - 用户ID
 * @param {string} templateType - 模板类型
 * @param {string} templateId - 模板ID
 * @param {number} count - 增加的次数，默认1
 * @returns {Promise<UserSubscribeQuota>} 更新后的配额记录
 */
UserSubscribeQuota.increaseQuota = async function(userId, templateType, templateId, count = 1) {
  const quota = await this.getOrCreate(userId, templateType, templateId);
  
  return await quota.update({
    remaining_quota: quota.remaining_quota + count,
    total_quota: quota.total_quota + count,
    last_authorized_at: new Date()
  });
};

/**
 * 类方法：减少用户的订阅配额
 * @param {number} userId - 用户ID
 * @param {string} templateType - 模板类型
 * @param {number} count - 减少的次数，默认1
 * @returns {Promise<UserSubscribeQuota|null>} 更新后的配额记录，如果不存在返回null
 */
UserSubscribeQuota.decreaseQuota = async function(userId, templateType, count = 1) {
  const quota = await this.findOne({
    where: {
      user_id: userId,
      template_type: templateType
    }
  });
  
  if (!quota) {
    return null;
  }
  
  // 确保不会减到负数
  const newQuota = Math.max(0, quota.remaining_quota - count);
  
  return await quota.update({
    remaining_quota: newQuota,
    last_sent_at: new Date()
  });
};

/**
 * 类方法：重置用户的订阅配额为0（用于同步微信状态）
 * @param {number} userId - 用户ID
 * @param {string} templateType - 模板类型
 * @returns {Promise<UserSubscribeQuota|null>} 更新后的配额记录，如果不存在返回null
 */
UserSubscribeQuota.resetQuota = async function(userId, templateType) {
  const quota = await this.findOne({
    where: {
      user_id: userId,
      template_type: templateType
    }
  });
  
  if (!quota) {
    return null;
  }
  
  return await quota.update({
    remaining_quota: 0
  });
};

/**
 * 类方法：获取用户所有模板的配额情况
 * @param {number} userId - 用户ID
 * @returns {Promise<Array<UserSubscribeQuota>>} 配额记录列表
 */
UserSubscribeQuota.getUserQuotas = async function(userId) {
  return await this.findAll({
    where: {
      user_id: userId
    },
    order: [['template_type', 'ASC']]
  });
};

module.exports = UserSubscribeQuota;

