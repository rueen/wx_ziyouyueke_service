const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 地址模型
 */
const Address = sequelize.define('addresses', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '地址ID'
  },
  user_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '用户ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '地址名称'
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '详细地址'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    comment: '纬度'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false,
    comment: '经度'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否为默认地址'
  }
}, {
  tableName: 'addresses',
  comment: '地址表',
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_user_id'
    },
    {
      fields: ['user_id', 'is_default'],
      name: 'idx_user_default'
    },
    {
      fields: ['createdAt'],
      name: 'idx_created_at'
    }
  ]
});

/**
 * 设置用户关联
 */
Address.associate = function(models) {
  Address.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

/**
 * 实例方法：设置为默认地址
 */
Address.prototype.setAsDefault = async function() {
  const transaction = await sequelize.transaction();
  
  try {
    // 先将该用户的所有地址设为非默认
    await Address.update(
      { is_default: false },
      { 
        where: { user_id: this.user_id },
        transaction 
      }
    );
    
    // 再将当前地址设为默认
    await this.update({ is_default: true }, { transaction });
    
    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = Address; 