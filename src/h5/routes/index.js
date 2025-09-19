/*
 * @Author: diaochan
 * @Date: 2025-09-03 20:02:54
 * @LastEditors: diaochan
 * @LastEditTime: 2025-09-03 21:37:38
 * @Description: 
 */
const express = require('express');
const router = express.Router();

// 引入子路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const relationRoutes = require('./relation');
const courseRoutes = require('./course');
const timeTemplateRoutes = require('./timeTemplate');
const addressRoutes = require('./address');
const categoryRoutes = require('./category');

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
router.use('/relations', relationRoutes);

// 课程相关路由
router.use('/courses', courseRoutes); // 支持复数形式


// 时间模板路由
router.use('/time-templates', timeTemplateRoutes);

// 地址相关路由
router.use('/addresses', addressRoutes);

// 课程分类相关路由
router.use('/categories', categoryRoutes);

module.exports = router;