const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 订阅消息发送记录模型
 */
const SubscribeMessageLog = sequelize.define('subscribe_message_logs', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '记录ID'
  },
  template_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '消息模板ID'
  },
  template_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模板类型：BOOKING_CONFIRM-预约确认提醒, BOOKING_SUCCESS-预约成功通知'
  },
  business_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '业务类型：course_booking-课程预约, group_course-团课等'
  },
  business_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '业务关联ID（如：course_booking_id）'
  },
  receiver_user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '接收人用户ID'
  },
  receiver_openid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '接收人openid'
  },
  message_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '消息数据内容'
  },
  page_path: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '跳转页面路径'
  },
  send_status: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '发送状态：0-发送中，1-发送成功，2-发送失败'
  },
  send_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '发送时间'
  },
  error_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '错误码'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  retry_count: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    comment: '重试次数'
  }
}, {
  tableName: 'subscribe_message_logs',
  comment: '订阅消息发送记录表',
  indexes: [
    {
      fields: ['business_type', 'business_id'],
      name: 'idx_business'
    },
    {
      fields: ['receiver_user_id'],
      name: 'idx_receiver_user'
    },
    {
      fields: ['template_type'],
      name: 'idx_template_type'
    },
    {
      fields: ['send_status'],
      name: 'idx_send_status'
    },
    {
      fields: ['send_time'],
      name: 'idx_send_time'
    },
    {
      // 复合索引：用于检查是否已发送
      unique: true,
      fields: ['business_type', 'business_id', 'template_type', 'receiver_user_id'],
      name: 'uk_business_template_receiver'
    }
  ]
});

/**
 * 类方法：检查消息是否已发送
 * @param {string} businessType - 业务类型
 * @param {number} businessId - 业务ID
 * @param {string} templateType - 模板类型
 * @param {number} receiverUserId - 接收人用户ID
 * @returns {Promise<boolean>} 是否已发送
 */
SubscribeMessageLog.isMessageSent = async function(businessType, businessId, templateType, receiverUserId) {
  const count = await this.count({
    where: {
      business_type: businessType,
      business_id: businessId,
      template_type: templateType,
      receiver_user_id: receiverUserId,
      send_status: 1 // 只检查发送成功的记录
    }
  });
  return count > 0;
};

/**
 * 类方法：记录消息发送
 * @param {Object} params - 参数对象
 * @returns {Promise<SubscribeMessageLog>} 创建的记录
 */
SubscribeMessageLog.recordMessage = async function(params) {
  const {
    templateId,
    templateType,
    businessType,
    businessId,
    receiverUserId,
    receiverOpenid,
    messageData,
    pagePath,
    sendStatus = 0,
    errorCode = null,
    errorMessage = null
  } = params;

  return await this.create({
    template_id: templateId,
    template_type: templateType,
    business_type: businessType,
    business_id: businessId,
    receiver_user_id: receiverUserId,
    receiver_openid: receiverOpenid,
    message_data: messageData,
    page_path: pagePath,
    send_status: sendStatus,
    error_code: errorCode,
    error_message: errorMessage
  });
};

/**
 * 实例方法：更新发送状态
 * @param {number} status - 状态：1-成功，2-失败
 * @param {string} errorCode - 错误码
 * @param {string} errorMessage - 错误信息
 * @returns {Promise<SubscribeMessageLog>} 更新后的记录
 */
SubscribeMessageLog.prototype.updateSendStatus = async function(status, errorCode = null, errorMessage = null) {
  return await this.update({
    send_status: status,
    error_code: errorCode,
    error_message: errorMessage
  });
};

/**
 * 实例方法：增加重试次数
 * @returns {Promise<SubscribeMessageLog>} 更新后的记录
 */
SubscribeMessageLog.prototype.incrementRetryCount = async function() {
  return await this.update({
    retry_count: this.retry_count + 1
  });
};

module.exports = SubscribeMessageLog;

