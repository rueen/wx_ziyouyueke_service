const express = require('express');
const router = express.Router();
const CourseController = require('../../controllers/h5/CourseController');
const { authenticateToken } = require('../../middleware/auth');

/**
 * 课程相关路由
 */

// 预约课程
router.post('/', authenticateToken, CourseController.createBooking);

// 获取课程列表
router.get('/', authenticateToken, CourseController.getCourseList);

// 获取课程详情
router.get('/:id', authenticateToken, CourseController.getCourseDetail);

// 确认课程
router.put('/:id/confirm', authenticateToken, CourseController.confirmCourse);

// 取消课程
router.put('/:id/cancel', authenticateToken, CourseController.cancelCourse);

// 完成课程
router.put('/:id/complete', authenticateToken, CourseController.completeCourse);

module.exports = router; 