const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/h5/UserController');
const { authenticateToken } = require('../../middleware/auth');
const { updateProfileValidation, decryptPhoneValidation, validateRequest } = require('../../middleware/validation');

/**
 * 用户信息相关路由
 */

// 获取用户信息（需要认证的个人信息）
router.get('/profile', authenticateToken, UserController.getProfile);

// 获取用户详情（公开接口，无需认证）
router.get('/:id', UserController.getUserDetail);

// 更新用户信息
router.put('/profile', authenticateToken, updateProfileValidation, validateRequest, UserController.updateProfile);

// 解密微信手机号
router.post('/decrypt-phone', authenticateToken, decryptPhoneValidation, validateRequest, UserController.decryptPhone);

module.exports = router; 