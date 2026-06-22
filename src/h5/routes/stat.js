const express = require('express');
const router = express.Router();
const StatController = require('../controllers/StatController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 数据统计相关路由（仅教练可访问）
 */

// 总览统计：已消课时、消课收入、剩余课时、未消课金额
router.get('/overview', authenticateToken, StatController.getOverview);

// 消课排行榜
router.get('/completion-ranking', authenticateToken, StatController.getCompletionRanking);

// 新增统计：新增学员、新增课时、续课数
router.get('/growth', authenticateToken, StatController.getGrowth);

module.exports = router;
