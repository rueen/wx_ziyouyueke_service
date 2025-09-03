const express = require('express');
const router = express.Router();
const AddressController = require('../controllers/AddressController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { addressCreateValidation, addressUpdateValidation, validateRequest } = require('../../shared/middlewares/validation');

/**
 * 地址管理相关路由
 */

// 获取地址列表
router.get('/', authenticateToken, AddressController.getAddressList);

// 获取默认地址
router.get('/default', authenticateToken, AddressController.getDefaultAddress);

// 创建地址
router.post('/', authenticateToken, addressCreateValidation, validateRequest, AddressController.createAddress);

// 更新地址
router.put('/:id', authenticateToken, addressUpdateValidation, validateRequest, AddressController.updateAddress);

// 删除地址
router.delete('/:id', authenticateToken, AddressController.deleteAddress);

// 设置默认地址
router.put('/:id/default', authenticateToken, AddressController.setDefaultAddress);

module.exports = router; 