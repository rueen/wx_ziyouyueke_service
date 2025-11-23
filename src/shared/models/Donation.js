const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 赞助记录模型
 */
const Donation = sequelize.define('donations', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '赞助ID'
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '赞助用户ID'
  },
  openid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '用户openid'
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '赞助金额(分)'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '留言内容'
  },
  is_anonymous: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '是否匿名：0-否，1-是'
  },
  out_trade_no: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '商户订单号'
  },
  transaction_id: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: '微信支付订单号'
  },
  payment_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '支付状态：0-待支付，1-已支付，2-已关闭，3-支付失败'
  },
  prepay_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '预支付交易会话标识'
  },
  paid_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '关闭时间'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '管理员备注'
  }
}, {
  tableName: 'donations',
  comment: '赞助记录表',
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    },
    {
      fields: ['payment_status'],
      name: 'idx_payment_status'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    },
    {
      unique: true,
      fields: ['out_trade_no'],
      name: 'uk_out_trade_no'
    }
  ]
});

/**
 * 实例方法：标记为已支付
 * @param {string} transactionId - 微信支付订单号
 */
Donation.prototype.markAsPaid = function(transactionId) {
  return this.update({
    payment_status: 1,
    transaction_id: transactionId,
    paid_at: new Date()
  });
};

/**
 * 实例方法：标记为已关闭
 */
Donation.prototype.markAsClosed = function() {
  return this.update({
    payment_status: 2,
    closed_at: new Date()
  });
};

/**
 * 实例方法：标记为支付失败
 */
Donation.prototype.markAsFailed = function() {
  return this.update({
    payment_status: 3
  });
};

/**
 * 静态方法：生成商户订单号
 * @returns {string} 订单号
 */
Donation.generateOutTradeNo = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  
  return `DON${year}${month}${day}${hour}${minute}${second}${random}`;
};

module.exports = Donation;

