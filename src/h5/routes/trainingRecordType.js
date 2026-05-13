const express = require('express');
const router = express.Router();
const TrainingRecordTypeController = require('../controllers/TrainingRecordTypeController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const {
  createTrainingRecordTypeValidation,
  updateTrainingRecordTypeValidation,
  validateRequest,
  idParamValidation
} = require('../../shared/middlewares/validation');

/**
 * 训练类型相关路由
 */

// 获取训练类型列表（当前登录教练的全部类型）
router.get('/', authenticateToken, TrainingRecordTypeController.getList);

// 新增训练类型
router.post('/', authenticateToken, createTrainingRecordTypeValidation, validateRequest, TrainingRecordTypeController.create);

// 编辑训练类型
router.put('/:id', authenticateToken, idParamValidation, updateTrainingRecordTypeValidation, validateRequest, TrainingRecordTypeController.update);

// 删除训练类型（软删除）
router.delete('/:id', authenticateToken, idParamValidation, validateRequest, TrainingRecordTypeController.remove);

module.exports = router;
