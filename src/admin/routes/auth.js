const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const adminAuth = require('../middlewares/adminAuth');
const { validate } = require('../../shared/middlewares/validation');

/**
 * 管理员登录
 * POST /api/admin/auth/login
 */
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 1, max: 50 })
    .withMessage('用户名长度应在1-50个字符之间'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 1 })
    .withMessage('密码不能为空'),
  validate
], AuthController.login);

/**
 * 管理员退出登录
 * POST /api/admin/auth/logout
 */
router.post('/logout', adminAuth, AuthController.logout);

/**
 * 获取管理员信息
 * GET /api/admin/auth/profile
 */
router.get('/profile', adminAuth, AuthController.getProfile);

module.exports = router;
