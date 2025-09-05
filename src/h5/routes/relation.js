/*
 * @Author: diaochan
 * @Date: 2025-06-02 15:18:48
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-02 15:37:35
 * @Description: 
 */
const express = require('express');
const router = express.Router();
const RelationController = require('../controllers/RelationController');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { 
  relationBindValidation, 
  remarkUpdateValidation, 
  validateRequest, 
  idParamValidation
} = require('../../shared/middlewares/validation');

/**
 * 师生关系相关路由
 */

// 绑定师生关系
router.post('/', authenticateToken, relationBindValidation, validateRequest, RelationController.bindRelation);

// 获取我的教练列表
router.get('/my-coaches', authenticateToken, RelationController.getMyCoaches);

// 获取我的学员列表
router.get('/my-students', authenticateToken, RelationController.getMyStudents);

// 获取师生关系详情
router.get('/:id', authenticateToken, idParamValidation, validateRequest, RelationController.getRelation);

// 更新师生关系备注
router.put('/:id', authenticateToken, idParamValidation, remarkUpdateValidation, validateRequest, RelationController.updateRelation);

// 解除师生关系
router.delete('/:id', authenticateToken, idParamValidation, validateRequest, RelationController.removeRelation);

module.exports = router; 