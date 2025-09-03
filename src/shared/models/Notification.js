const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 消息通知模型
 */
const Notification = sequelize.define('notifications', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '接收用户ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '通知标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '通知内容'
  },
  notification_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '通知类型：booking,cancel,confirm,complete,system'
  },
  related_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '关联ID（如课程ID）'
  },
  related_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '关联类型'
  },
  is_read: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: '是否已读：0-未读，1-已读'
  },
  read_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '阅读时间'
  },
  send_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '发送时间'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间'
  }
}, {
  tableName: 'notifications',
  comment: '消息通知表',
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    },
    {
      fields: ['is_read'],
      name: 'idx_is_read'
    },
    {
      fields: ['notification_type'],
      name: 'idx_notification_type'
    },
    {
      fields: ['send_time'],
      name: 'idx_send_time'
    }
  ]
});

/**
 * 实例方法：标记为已读
 */
Notification.prototype.markAsRead = function() {
  return this.update({
    is_read: 1,
    read_time: new Date()
  });
};

/**
 * 类方法：创建通知
 */
Notification.createNotification = function(userId, title, content, type, relatedId = null, relatedType = null) {
  return this.create({
    user_id: userId,
    title,
    content,
    notification_type: type,
    related_id: relatedId,
    related_type: relatedType
  });
};

/**
 * 类方法：获取用户未读通知数量
 */
Notification.getUnreadCount = function(userId) {
  return this.count({
    where: {
      user_id: userId,
      is_read: 0
    }
  });
};

module.exports = Notification; 