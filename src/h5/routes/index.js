/*
 * @Author: diaochan
 * @Date: 2025-09-03 20:02:54
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-03 20:23:49
 * @Description: 
 */
const express = require('express');
const router = express.Router();

// 引入子路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const relationRoutes = require('./relation');
const courseRoutes = require('./course');
const studentRoutes = require('./student');
const timeTemplateRoutes = require('./timeTemplate');
const addressRoutes = require('./address');

/**
 * H5端路由配置
 */

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'H5端接口正常',
    timestamp: new Date().toISOString(),
    version: require('../../../package.json').version
  });
});

// 认证相关路由
router.use('/auth', authRoutes);

// 用户相关路由
router.use('/user', userRoutes);

// 师生关系路由
router.use('/relation', relationRoutes);

// 课程相关路由
router.use('/courses', courseRoutes); // 支持复数形式

// 学员相关路由
router.use('/student', studentRoutes);

// 时间模板路由
router.use('/time-template', timeTemplateRoutes);

// 地址相关路由
router.use('/address', addressRoutes);

module.exports = router;