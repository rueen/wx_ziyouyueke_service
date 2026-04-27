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

// 批量取消休息时段（必须在 /:id 之前注册，避免 batch 被当成 id 参数）
router.delete('/batch', authenticateToken, BlockedSlotController.batchRemove);

// 取消单条休息时段（只能删除自己的记录）
router.delete('/:id', authenticateToken, BlockedSlotController.remove);

module.exports = router;
