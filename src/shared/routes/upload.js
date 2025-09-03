const express = require('express');
const router = express.Router();
const UploadController = require('../controllers/UploadController');
const { authenticateToken } = require('../middlewares/auth');
const { idParamValidation, validateRequest } = require('../middlewares/validation');

/**
 * 文件上传相关路由
 */

// 上传图片
router.post('/image', authenticateToken, UploadController.uploadImage);

// 删除图片
router.delete('/image/:filename', authenticateToken, UploadController.deleteImage);

module.exports = router; 