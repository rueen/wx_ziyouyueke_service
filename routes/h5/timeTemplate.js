const express = require('express');
const router = express.Router();
const TimeTemplateController = require('../../controllers/h5/TimeTemplateController');
const { authenticateToken } = require('../../middleware/auth');
const { timeTemplateValidation, validateRequest, idParamValidation } = require('../../middleware/validation');

/**
 * 时间模板相关路由
 */

// 获取时间模板列表
router.get('/', authenticateToken, TimeTemplateController.getTemplates);

// 获取时间模板详情
router.get('/:id', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.getTemplate);

// 创建时间模板
router.post('/', authenticateToken, timeTemplateValidation, validateRequest, TimeTemplateController.createTemplate);

// 更新时间模板
router.put('/:id', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.updateTemplate);

// 删除时间模板
router.delete('/:id', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.deleteTemplate);

// 启用/禁用时间模板
router.put('/:id/toggle', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.toggleTemplate);

module.exports = router; 