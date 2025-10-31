const express = require('express');
const router = express.Router();
const CoachController = require('../controllers/CoachController');

/**
 * 教练相关路由
 */

// 获取所有教练列表（无需登录）
router.get('/', CoachController.getCoaches);

module.exports = router;
