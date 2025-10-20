const express = require('express');
const router = express.Router();
const GroupCourseController = require('../controllers/GroupCourseController');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { body, param, query, validationResult } = require('express-validator');

/**
 * 验证中间件
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '参数验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 通用ID参数验证
 */
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID必须是正整数')
];

/**
 * 创建团课验证
 */
const createGroupCourseValidation = [
  body('title').notEmpty().withMessage('团课标题不能为空'),
  body('course_date').isDate().withMessage('上课日期格式不正确'),
  body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式不正确'),
  body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式不正确'),
  body('max_participants').isInt({ min: 1 }).withMessage('最大参与人数必须是正整数'),
  body('min_participants').isInt({ min: 1 }).withMessage('最小开课人数必须是正整数'),
  body('price_type').isIn([1, 2, 3]).withMessage('收费方式必须是1-3之间的数字'),
  body('enrollment_scope').isIn([1, 2]).withMessage('报名范围必须是1或2')
];

/**
 * 更新团课验证
 */
const updateGroupCourseValidation = [
  body('title').optional().notEmpty().withMessage('团课标题不能为空'),
  body('course_date').optional().isDate().withMessage('上课日期格式不正确'),
  body('start_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式不正确'),
  body('end_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式不正确'),
  body('max_participants').optional().isInt({ min: 1 }).withMessage('最大参与人数必须是正整数'),
  body('min_participants').optional().isInt({ min: 1 }).withMessage('最小开课人数必须是正整数'),
  body('price_type').optional().isIn([1, 2, 3]).withMessage('收费方式必须是1-3之间的数字'),
  body('enrollment_scope').optional().isIn([1, 2]).withMessage('报名范围必须是1或2')
];

/**
 * 分页查询验证
 */
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
];

/**
 * 我的团课报名列表验证
 */
const myRegistrationsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('id').optional().isInt({ min: 1 }).withMessage('ID必须是正整数'),
  query('status').optional().isIn(['0', '1']).withMessage('状态必须是0或1')
];

// ==================== 团课管理接口 ====================

/**
 * 获取我的团课报名列表（学员视角）
 * GET /api/h5/group-courses/my-registrations
 */
router.get('/my-registrations', 
  authenticateToken, 
  myRegistrationsValidation, 
  validateRequest, 
  GroupCourseController.getMyRegistrations
);

/**
 * 创建团课
 * POST /api/h5/group-courses
 */
router.post('/', 
  authenticateToken, 
  createGroupCourseValidation, 
  validateRequest, 
  GroupCourseController.createGroupCourse
);

/**
 * 获取团课列表
 * GET /api/h5/group-courses
 */
router.get('/', 
  optionalAuth, // 可选认证：未登录可查看已发布团课，登录后可查看自己的草稿
  paginationValidation, 
  validateRequest, 
  GroupCourseController.getGroupCourseList
);

/**
 * 获取团课详情
 * GET /api/h5/group-courses/:id
 */
router.get('/:id', 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.getGroupCourseDetail
);

/**
 * 更新团课
 * PUT /api/h5/group-courses/:id
 */
router.put('/:id', 
  authenticateToken, 
  idParamValidation, 
  updateGroupCourseValidation, 
  validateRequest, 
  GroupCourseController.updateGroupCourse
);

/**
 * 发布团课
 * PUT /api/h5/group-courses/:id/publish
 */
router.put('/:id/publish', 
  authenticateToken, 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.publishGroupCourse
);

/**
 * 取消团课
 * PUT /api/h5/group-courses/:id/cancel
 */
router.put('/:id/cancel', 
  authenticateToken, 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.cancelGroupCourse
);

/**
 * 删除团课
 * DELETE /api/h5/group-courses/:id
 */
router.delete('/:id', 
  authenticateToken, 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.deleteGroupCourse
);

// ==================== 报名相关接口 ====================

/**
 * 报名团课
 * POST /api/h5/group-courses/:id/register
 */
router.post('/:id/register', 
  authenticateToken, 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.registerGroupCourse
);

/**
 * 取消报名
 * DELETE /api/h5/group-courses/:id/register
 */
router.delete('/:id/register', 
  authenticateToken, 
  idParamValidation, 
  validateRequest, 
  GroupCourseController.cancelRegistration
);

/**
 * 获取团课报名列表（教练视角）
 * GET /api/h5/group-courses/:id/registrations
 */
router.get('/:id/registrations', 
  authenticateToken, 
  idParamValidation, 
  paginationValidation, 
  validateRequest, 
  GroupCourseController.getCourseRegistrations
);

/**
 * 签到团课
 * POST /api/h5/group-courses/:courseId/registrations/:registrationId/check-in
 */
router.post('/:courseId/registrations/:registrationId/check-in', 
  authenticateToken,
  [
    param('courseId').isInt({ min: 1 }).withMessage('团课ID必须是正整数'),
    param('registrationId').isInt({ min: 1 }).withMessage('报名ID必须是正整数')
  ],
  validateRequest, 
  GroupCourseController.checkInRegistration
);

/**
 * 完成团课
 * PUT /api/h5/group-courses/:id/complete
 */
router.put('/:id/complete', 
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).withMessage('团课ID必须是正整数'),
    body('feedback').optional().isString().withMessage('反馈内容必须是字符串')
  ],
  validateRequest, 
  GroupCourseController.completeGroupCourse
);

module.exports = router;