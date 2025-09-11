const express = require('express');
const router = express.Router();
const TimeTemplateController = require('../controllers/TimeTemplateController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { timeTemplateValidation, validateRequest, idParamValidation } = require('../../shared/middlewares/validation');

/**
 * 时间模板相关路由
 */

// 获取时间模板列表
router.get('/', authenticateToken, TimeTemplateController.getTemplates);



// 更新时间模板
router.put('/:id', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.updateTemplate);


// 启用/禁用时间模板
router.put('/:id/toggle', authenticateToken, idParamValidation, validateRequest, TimeTemplateController.toggleTemplate);

module.exports = router; 