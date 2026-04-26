const express = require('express');
const router = express.Router();
const BlockedSlotController = require('../controllers/BlockedSlotController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 教练休息时段相关路由
 */

// 查询休息时段列表（coach_id 可选，date 必填）
router.get('/', authenticateToken, BlockedSlotController.getList);

// 设置休息时段
router.post('/', authenticateToken, BlockedSlotController.create);

// 取消休息时段（只能删除自己的记录）
router.delete('/:id', authenticateToken, BlockedSlotController.remove);

module.exports = router;
