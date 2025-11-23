const express = require('express');
const router = express.Router();
const DonationController = require('../controllers/DonationController');
const adminAuth = require('../../shared/middlewares/adminAuth');
const { param, body } = require('express-validator');
const { validate } = require('../../shared/middlewares/validation');

/**
 * @route   GET /api/admin/donations
 * @desc    获取赞助列表
 * @access  Admin
 */
router.get('/',
  adminAuth,
  DonationController.getDonationList
);

/**
 * @route   GET /api/admin/donations/statistics
 * @desc    获取赞助统计
 * @access  Admin
 */
router.get('/statistics',
  adminAuth,
  DonationController.getDonationStatistics
);

/**
 * @route   GET /api/admin/donations/:id
 * @desc    获取赞助详情
 * @access  Admin
 */
router.get('/:id',
  adminAuth,
  [
    param('id').isInt().withMessage('赞助ID必须为整数')
  ],
  validate,
  DonationController.getDonationDetail
);

/**
 * @route   PUT /api/admin/donations/:id/remark
 * @desc    更新赞助备注
 * @access  Admin
 */
router.put('/:id/remark',
  adminAuth,
  [
    param('id').isInt().withMessage('赞助ID必须为整数'),
    body('remark').optional().isString().withMessage('备注必须为字符串')
  ],
  validate,
  DonationController.updateDonationRemark
);

module.exports = router;

