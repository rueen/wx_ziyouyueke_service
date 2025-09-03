const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const UserController = require('../controllers/UserController');
const adminAuth = require('../middlewares/adminAuth');
const { validate } = require('../../shared/middlewares/validation');

/**
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数'),
  query('status')
    .optional()
    .isIn(['0', '1', ''])
    .withMessage('状态值无效'),
  validate
], adminAuth, UserController.getUserList);

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是大于0的整数'),
  validate
], adminAuth, UserController.getUserDetail);

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是大于0的整数'),
  validate
], adminAuth, UserController.deleteUser);

/**
 * 修改用户状态
 * PUT /api/admin/users/:id/status
 */
router.put('/:id/status', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是大于0的整数'),
  body('status')
    .isIn([0, 1])
    .withMessage('状态值必须是0或1'),
  validate
], adminAuth, UserController.updateUserStatus);

module.exports = router;
