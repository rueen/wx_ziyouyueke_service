const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 训练计划相关路由
 */

// 获取训练计划列表
router.get('/', authenticateToken, PlanController.getPlanList);

// 获取训练计划详情
router.get('/:id', authenticateToken, PlanController.getPlanDetail);

// 新增训练计划
router.post('/', authenticateToken, PlanController.createPlan);

// 编辑训练计划
router.put('/:id', authenticateToken, PlanController.updatePlan);

// 删除训练计划
router.delete('/:id', authenticateToken, PlanController.deletePlan);

module.exports = router;
