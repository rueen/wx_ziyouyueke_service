const express = require('express');
const { query, param } = require('express-validator');
const router = express.Router();
const CourseController = require('../../controllers/admin/CourseController');
const adminAuth = require('../../middleware/adminAuth');
const { validate } = require('../../middleware/validation');

/**
 * 获取课程列表
 * GET /api/admin/courses
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
    .isIn(['1', '2', '3', '4', '5', ''])
    .withMessage('状态值无效'),
  query('start_date')
    .optional()
    .isDate()
    .withMessage('开始日期格式无效'),
  query('end_date')
    .optional()
    .isDate()
    .withMessage('结束日期格式无效'),
  validate
], adminAuth, CourseController.getCourseList);

/**
 * 获取课程详情
 * GET /api/admin/courses/:id
 */
router.get('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('课程ID必须是大于0的整数'),
  validate
], adminAuth, CourseController.getCourseDetail);

/**
 * 删除课程
 * DELETE /api/admin/courses/:id
 */
router.delete('/:id', [
  param('id')
    .isInt({ min: 1 })
    .withMessage('课程ID必须是大于0的整数'),
  validate
], adminAuth, CourseController.deleteCourse);

/**
 * 获取课程统计
 * GET /api/admin/courses/stats
 */
router.get('/stats', adminAuth, CourseController.getCourseStats);

module.exports = router;
