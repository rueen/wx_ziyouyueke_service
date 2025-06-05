const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/h5/UserController');
const { authenticateToken } = require('../../middleware/auth');
const { updateProfileValidation, validateRequest } = require('../../middleware/validation');

/**
 * 用户信息相关路由
 */

// 获取用户信息
router.get('/profile', authenticateToken, UserController.getProfile);

// 更新用户信息
router.put('/profile', authenticateToken, updateProfileValidation, validateRequest, UserController.updateProfile);

// 上传头像
router.post('/avatar', authenticateToken, UserController.uploadAvatar);

// 获取用户统计信息
router.get('/stats', authenticateToken, UserController.getUserStats);

module.exports = router; 