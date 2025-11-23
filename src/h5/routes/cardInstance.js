const express = require('express');
const router = express.Router();
const CardInstanceController = require('../controllers/CardInstanceController');
const { authenticateToken } = require('../../shared/middlewares/auth');

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 卡片实例管理路由
 */

// 获取可用的卡片实例列表（用于约课）
router.get('/available', CardInstanceController.getAvailableInstances);

// 获取指定学员的卡片实例列表（教练视角）
router.get('/student/:studentId', CardInstanceController.getStudentInstances);

// 获取我的卡片实例列表（学员视角）
router.get('/my-cards/:coachId', CardInstanceController.getMyInstances);

// 为学员添加卡片实例（教练操作）
router.post('/', CardInstanceController.createInstance);

// 获取卡片实例详情
router.get('/:id', CardInstanceController.getInstanceDetail);

// 开卡（教练操作）
router.put('/:id/activate', CardInstanceController.activateInstance);

// 停卡（教练操作）
router.put('/:id/deactivate', CardInstanceController.deactivateInstance);

// 重新开启卡片（教练操作）
router.put('/:id/reactivate', CardInstanceController.reactivateInstance);

// 删除卡片实例（教练操作）
router.delete('/:id', CardInstanceController.deleteInstance);

module.exports = router;

