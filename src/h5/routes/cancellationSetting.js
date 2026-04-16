const express = require('express');
const router = express.Router();
const CancellationSettingController = require('../controllers/CancellationSettingController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 取消次数限制配置相关路由
 */

// 获取教练的取消次数限制配置
router.get('/', authenticateToken, CancellationSettingController.getSetting);

// 创建或更新教练的取消次数限制配置
router.put('/', authenticateToken, CancellationSettingController.upsertSetting);

module.exports = router;
