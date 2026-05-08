const express = require('express');
const router = express.Router();
const CoachSettingController = require('../controllers/CoachSettingController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 教练设置相关路由
 */

// 获取当前教练设置
router.get('/', authenticateToken, CoachSettingController.getSetting);

// 创建或更新教练设置
router.put('/', authenticateToken, CoachSettingController.upsertSetting);

module.exports = router;
