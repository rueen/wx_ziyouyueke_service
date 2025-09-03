const express = require('express');
const router = express.Router();

// 引入子路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const courseRoutes = require('./course');

/**
 * 管理端路由配置
 */

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '管理端接口正常',
    timestamp: new Date().toISOString(),
    version: require('../../../package.json').version
  });
});

// 认证相关路由
router.use('/auth', authRoutes);

// 用户管理路由
router.use('/users', userRoutes);

// 课程管理路由
router.use('/courses', courseRoutes);

module.exports = router; 