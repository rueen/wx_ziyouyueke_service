const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 教练卡片模板模型
 */
const CoachCard = sequelize.define('coach_cards', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    comment: '卡片模板ID'
  },
  coach_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    comment: '教练ID'
  },
  card_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '卡片名称'
  },
  card_color: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '卡片颜色'
  },
  card_lessons: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment: '课时数（NULL表示无限次数）'
  },
  valid_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    comment: '有效天数'
  },
  card_desc: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '卡片描述'
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否启用：0-禁用，1-启用'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '删除时间（软删除）'
  }
}, {
  tableName: 'coach_cards',
  comment: '教练卡片模板表',
  paranoid: true, // 启用软删除
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['coach_id'],
      name: 'idx_coach_id'
    },
    {
      fields: ['is_active'],
      name: 'idx_is_active'
    },
    {
      fields: ['deleted_at'],
      name: 'idx_deleted_at'
    }
  ]
});

/**
 * 实例方法：检查是否可以删除
 * @returns {Promise<Object>} { canDelete: boolean, reason: string, forceDelete: boolean }
 */
CoachCard.prototype.canDelete = async function() {
  // 必须是已禁用的卡片才能删除
  if (this.is_active === 1) {
    return { 
      canDelete: false, 
      reason: '只能删除已禁用的卡片模板',
      forceDelete: false
    };
  }

  // 检查是否有卡片实例
  const StudentCardInstance = this.sequelize.models.student_card_instances;
  const instanceCount = await StudentCardInstance.count({
    where: {
      coach_card_id: this.id
    }
  });

  // 如果有实例，只能软删除（保持数据完整性）
  // 如果没有实例，可以物理删除（彻底清除）
  return { 
    canDelete: true, 
    reason: '',
    forceDelete: instanceCount === 0 // 没有实例时使用物理删除
  };
};

/**
 * 实例方法：启用
 */
CoachCard.prototype.enable = async function() {
  if (this.is_active === 1) {
    throw new Error('卡片模板已启用');
  }
  return await this.update({ is_active: 1 });
};

/**
 * 实例方法：禁用
 */
CoachCard.prototype.disable = async function() {
  if (this.is_active === 0) {
    throw new Error('卡片模板已禁用');
  }
  return await this.update({ is_active: 0 });
};

/**
 * 实例方法：获取卡片信息摘要
 */
CoachCard.prototype.getSummary = function() {
  return {
    id: this.id,
    coach_id: this.coach_id,
    card_name: this.card_name,
    card_color: this.card_color,
    card_lessons: this.card_lessons,
    valid_days: this.valid_days,
    card_desc: this.card_desc,
    is_active: this.is_active,
    is_unlimited: this.card_lessons === null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = CoachCard;

