const express = require('express');
const router = express.Router();
const CoachCardController = require('../controllers/CoachCardController');
const { authenticateToken } = require('../../shared/middlewares/auth');

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 卡片模板管理路由
 */

// 获取启用的卡片模板列表（用于添加卡片实例）
router.get('/active-list', CoachCardController.getActiveCards);

// 获取我的卡片模板列表
router.get('/', CoachCardController.getMyCards);

// 创建卡片模板
router.post('/', CoachCardController.createCard);

// 获取卡片模板详情
router.get('/:id', CoachCardController.getCardDetail);

// 编辑卡片模板
router.put('/:id', CoachCardController.updateCard);

// 启用/禁用卡片模板
router.put('/:id/toggle-active', CoachCardController.toggleActive);

// 删除卡片模板（软删除）
router.delete('/:id', CoachCardController.deleteCard);

module.exports = router;

