/*
 * @Author: diaochan
 * @Date: 2025-06-02 15:18:23
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-06 15:33:43
 * @Description: 
 */
const express = require('express');
const router = express.Router();
const CoachController = require('../../controllers/h5/CoachController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * 教练相关路由
 */

// 获取教练列表
router.get('/list', authenticateToken, CoachController.getCoachList);

// 获取教练详情（无需认证）
router.get('/:id', CoachController.getCoachDetail);

// 获取教练课程安排
router.get('/:id/schedule', authenticateToken, CoachController.getCoachSchedule);

module.exports = router; 