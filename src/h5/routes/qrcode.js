const express = require('express');
const router = express.Router();
const QRCodeController = require('../controllers/QRCodeController');
const { authenticateToken } = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');

/**
 * 验证中间件
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 小程序码生成验证
 */
const qrcodeValidation = [
  body('scene')
    .notEmpty()
    .withMessage('scene参数不能为空')
    .isLength({ max: 32 })
    .withMessage('scene参数不能超过32个字符')
    .matches(/^[a-zA-Z0-9!#$&'()*+,/:;=?@\-._~]+$/)
    .withMessage('scene参数格式错误，只支持数字、大小写英文及部分特殊字符：!#$&\'()*+,/:;=?@-._~'),
  
  body('page')
    .optional()
    .isString()
    .withMessage('page参数必须是字符串'),
  
  body('check_path')
    .optional()
    .isBoolean()
    .withMessage('check_path参数必须是布尔值'),
  
  body('env_version')
    .optional()
    .isIn(['release', 'trial', 'develop'])
    .withMessage('env_version参数必须是release、trial或develop'),
  
  body('width')
    .optional()
    .isInt({ min: 280, max: 1280 })
    .withMessage('width参数必须是280-1280之间的整数'),
  
  body('auto_color')
    .optional()
    .isBoolean()
    .withMessage('auto_color参数必须是布尔值'),
  
  body('line_color')
    .optional()
    .isObject()
    .withMessage('line_color参数必须是对象'),
  
  body('line_color.r')
    .optional()
    .isInt({ min: 0, max: 255 })
    .withMessage('line_color.r参数必须是0-255之间的整数'),
  
  body('line_color.g')
    .optional()
    .isInt({ min: 0, max: 255 })
    .withMessage('line_color.g参数必须是0-255之间的整数'),
  
  body('line_color.b')
    .optional()
    .isInt({ min: 0, max: 255 })
    .withMessage('line_color.b参数必须是0-255之间的整数'),
  
  body('is_hyaline')
    .optional()
    .isBoolean()
    .withMessage('is_hyaline参数必须是布尔值')
];

// ==================== 小程序码接口 ====================

/**
 * 生成小程序码（返回图片）
 * POST /api/h5/qrcode/generate
 */
router.post('/generate',
  authenticateToken,
  qrcodeValidation,
  validateRequest,
  QRCodeController.generateQRCode
);

/**
 * 生成小程序码（返回Base64）
 * POST /api/h5/qrcode/generate-base64
 */
router.post('/generate-base64',
  authenticateToken,
  qrcodeValidation,
  validateRequest,
  QRCodeController.generateQRCodeBase64
);

module.exports = router;
