const express = require('express');
const router = express.Router();
const LessonChangeLogController = require('../controllers/LessonChangeLogController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 课时变动日志相关路由
 */

// 查询课时变动日志（教练/学员均可访问，权限在 Controller 中区分）
router.get('/', authenticateToken, LessonChangeLogController.getLogs);

module.exports = router;
