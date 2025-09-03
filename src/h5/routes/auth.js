const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { loginValidation, validateRequest } = require('../../shared/middlewares/validation');

/**
 * 认证相关路由
 */

// 用户注册/登录
router.post('/login', loginValidation, validateRequest, AuthController.login);

// 用户登出
router.post('/logout', authenticateToken, AuthController.logout);

// 刷新token
router.post('/refresh', AuthController.refreshToken);

// 验证token有效性
router.get('/verify', authenticateToken, AuthController.verifyToken);

module.exports = router; 