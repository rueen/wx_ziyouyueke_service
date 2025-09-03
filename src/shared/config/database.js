/*
 * @Author: diaochan
 * @Date: 2025-06-02 15:11:43
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-02 15:31:14
 * @Description: 
 */
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 数据库连接配置
 */
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'yueke',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  timezone: '+08:00',
  dialectOptions: {
    charset: 'utf8mb4',
    dateStrings: true,
    typeCast: true
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(msg);
    }
  },
  define: {
    timestamps: true,
    underscored: false,
    paranoid: false,
    freezeTableName: true,
    charset: 'utf8mb4'
  }
});

module.exports = sequelize; 