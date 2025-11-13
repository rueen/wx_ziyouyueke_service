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
  relationUpdateValidation, 
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

// 获取我的教练详情（学员视角）
router.get('/my-coaches/:id', authenticateToken, idParamValidation, validateRequest, RelationController.getMyCoachDetail);

// 获取我的学员列表
router.get('/my-students', authenticateToken, RelationController.getMyStudents);

// 获取我的学员详情（教练视角）
router.get('/my-students/:id', authenticateToken, idParamValidation, validateRequest, RelationController.getMyStudentDetail);


// 切换约课状态
router.put('/:id/booking-status', authenticateToken, idParamValidation, validateRequest, RelationController.toggleBookingStatus);

// 编辑师生关系权限
router.patch('/:id/permissions', authenticateToken, idParamValidation, validateRequest, RelationController.updateRelationPermissions);

// 更新师生关系
router.put('/:id', authenticateToken, idParamValidation, relationUpdateValidation, validateRequest, RelationController.updateRelation);

// 解除师生关系
router.delete('/:id', authenticateToken, idParamValidation, validateRequest, RelationController.removeRelation);


module.exports = router; 