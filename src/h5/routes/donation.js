const express = require('express');
const router = express.Router();
const DonationController = require('../controllers/DonationController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { body, param } = require('express-validator');
const { validate } = require('../../shared/middlewares/validation');

/**
 * @route   POST /api/h5/donations
 * @desc    创建赞助订单
 * @access  Private
 */
router.post('/',
  authenticateToken,
  [
    body('amount')
      .notEmpty().withMessage('赞助金额不能为空')
      .isInt({ min: 100, max: 50000 }).withMessage('赞助金额必须在1-500元之间'),
    body('message')
      .optional()
      .isLength({ max: 200 }).withMessage('留言最多200个字符'),
    body('is_anonymous')
      .optional()
      .isIn([0, 1]).withMessage('is_anonymous必须为0或1')
  ],
  validate,
  DonationController.createDonation
);

/**
 * @route   GET /api/h5/donations/:id
 * @desc    查询赞助订单详情
 * @access  Private
 */
router.get('/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('订单ID必须为整数')
  ],
  validate,
  DonationController.getDonationDetail
);

/**
 * @route   GET /api/h5/donations/my
 * @desc    获取我的赞助记录
 * @access  Private
 */
router.get('/my/list',
  authenticateToken,
  DonationController.getMyDonations
);

/**
 * @route   GET /api/h5/donations/list
 * @desc    获取赞助列表（公开）
 * @access  Public
 */
router.get('/list/public',
  DonationController.getDonationList
);

/**
 * @route   GET /api/h5/donations/:id/status
 * @desc    查询订单支付状态
 * @access  Private
 */
router.get('/:id/status',
  authenticateToken,
  [
    param('id').isInt().withMessage('订单ID必须为整数')
  ],
  validate,
  DonationController.queryPaymentStatus
);

/**
 * @route   POST /api/h5/donations/notify
 * @desc    支付结果回调（微信支付）
 * @access  Public (微信服务器回调)
 */
router.post('/notify',
  DonationController.paymentNotify
);

module.exports = router;

