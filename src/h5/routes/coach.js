const express = require('express');
const router = express.Router();
const CoachController = require('../controllers/CoachController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 教练相关路由
 */

// 获取所有教练列表（需要登录）
router.get('/', authenticateToken, CoachController.getCoaches);

module.exports = router;
