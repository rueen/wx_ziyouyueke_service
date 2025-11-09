const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../shared/middlewares/auth');
const WeChatController = require('../controllers/WeChatController');

/**
 * 获取所有可用的订阅消息模板
 */
router.get('/subscribe-templates', WeChatController.getSubscribeTemplates);

/**
 * 获取用户的订阅消息配额
 */
router.get('/subscribe-quotas', authenticateToken, WeChatController.getSubscribeQuotas);

/**
 * 上报用户授权订阅消息结果
 */
router.post('/subscribe-quotas', authenticateToken, WeChatController.reportSubscribeAuthorization);

module.exports = router;

