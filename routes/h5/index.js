const express = require('express');
const router = express.Router();

// 引入子路由
const authRoutes = require('./auth');
const userRoutes = require('./user');
const relationRoutes = require('./relation');
const timeTemplateRoutes = require('./timeTemplate');

/**
 * H5端路由配置
 */

// 认证相关路由
router.use('/auth', authRoutes);

// 用户信息路由
router.use('/user', userRoutes);

// 师生关系路由
router.use('/relations', relationRoutes);

// 时间模板路由
router.use('/time-templates', timeTemplateRoutes);

// 暂未实现的路由模块
// const coachRoutes = require('./coach');
// const studentRoutes = require('./student');
// const courseRoutes = require('./course');

// router.use('/coach', coachRoutes);
// router.use('/student', studentRoutes);
// router.use('/courses', courseRoutes);

module.exports = router; 