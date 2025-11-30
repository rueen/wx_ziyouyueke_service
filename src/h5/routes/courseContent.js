const express = require('express');
const router = express.Router();
const CourseContentController = require('../controllers/CourseContentController');
const { authenticateToken } = require('../../shared/middlewares/auth');

/**
 * 课程内容相关路由
 */

// 添加课程内容
router.post('/', authenticateToken, CourseContentController.createCourseContent);

// 编辑课程内容
router.put('/:id', authenticateToken, CourseContentController.updateCourseContent);

// 获取课程内容详情
router.get('/:id', authenticateToken, CourseContentController.getCourseContent);

// 根据课程ID获取课程内容
router.get('/by-course', authenticateToken, CourseContentController.getCourseContentByCourseId);

module.exports = router;

