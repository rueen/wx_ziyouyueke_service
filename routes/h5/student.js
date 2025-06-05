const express = require('express');
const router = express.Router();
const StudentController = require('../../controllers/h5/StudentController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * 学员相关路由
 */

// 获取学员预约记录
router.get('/bookings', authenticateToken, StudentController.getStudentBookings);



// 获取学员统计信息
router.get('/stats', authenticateToken, StudentController.getStudentStats);

module.exports = router; 