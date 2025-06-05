const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 操作日志模型
 */
const OperationLog = sequelize.define('operation_logs', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: 'ID'
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '操作用户ID'
  },
  operation_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '操作类型'
  },
  operation_desc: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '操作描述'
  },
  table_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '涉及表名'
  },
  record_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    comment: '记录ID'
  },
  old_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '操作前数据'
  },
  new_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '操作后数据'
  },
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'IP地址'
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '用户代理'
  }
}, {
  tableName: 'operation_logs',
  comment: '操作日志表',
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    },
    {
      fields: ['operation_type'],
      name: 'idx_operation_type'
    },
    {
      fields: ['table_name', 'record_id'],
      name: 'idx_table_record'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    }
  ]
});

/**
 * 类方法：记录操作日志
 */
OperationLog.log = function(params) {
  const {
    userId,
    operationType,
    operationDesc,
    tableName,
    recordId,
    oldData,
    newData,
    ipAddress,
    userAgent
  } = params;

  return this.create({
    user_id: userId,
    operation_type: operationType,
    operation_desc: operationDesc,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
    ip_address: ipAddress,
    user_agent: userAgent
  });
};

module.exports = OperationLog; 