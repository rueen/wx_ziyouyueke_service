const express = require('express');
const router = express.Router();
const TrainingRecordController = require('../controllers/TrainingRecordController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const {
  createTrainingRecordValidation,
  updateTrainingRecordValidation,
  validateRequest,
  idParamValidation
} = require('../../shared/middlewares/validation');

/**
 * 训练记录相关路由
 */

// 获取记录中用到的训练类型列表（用于筛选，必须在 /:id 路由前注册）
router.get('/types', authenticateToken, TrainingRecordController.getTypesInRecords);

// 获取训练记录列表（教练和学员均可访问）
router.get('/', authenticateToken, TrainingRecordController.getList);

// 新增训练记录（仅教练）
router.post('/', authenticateToken, createTrainingRecordValidation, validateRequest, TrainingRecordController.create);

// 编辑训练记录（仅教练）
router.put('/:id', authenticateToken, idParamValidation, updateTrainingRecordValidation, validateRequest, TrainingRecordController.update);

// 删除训练记录（仅教练，软删除）
router.delete('/:id', authenticateToken, idParamValidation, validateRequest, TrainingRecordController.remove);

module.exports = router;
