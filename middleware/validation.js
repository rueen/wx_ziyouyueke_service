const { body, param, query, validationResult } = require('express-validator');

/**
 * 参数验证中间件
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      code: 1001,
      message: '参数错误',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * 登录验证规则
 */
const loginValidation = [
  body('code')
    .notEmpty()
    .withMessage('微信登录凭证不能为空'),
  body('userInfo.nickname')
    .optional()
    .isLength({ max: 100 })
    .withMessage('昵称长度不能超过100个字符'),
  body('userInfo.gender')
    .optional()
    .isIn([0, 1, 2])
    .withMessage('性别值必须是0、1或2'),
  body('coach_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('教练ID必须是正整数')
];

/**
 * 用户信息更新验证规则
 */
const updateProfileValidation = [
  body('nickname')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('昵称长度必须在1-100个字符之间'),
  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),
  body('gender')
    .optional()
    .isIn([0, 1, 2])
    .withMessage('性别值必须是0、1或2'),
  body('intro')
    .optional()
    .isLength({ max: 500 })
    .withMessage('个人介绍不能超过500个字符')
];

/**
 * 时间模板验证规则
 */
const timeTemplateValidation = [
  body('min_advance_days')
    .isInt({ min: 0, max: 30 })
    .withMessage('最少提前天数必须在0-30之间'),
  body('max_advance_days')
    .isInt({ min: 1, max: 365 })
    .withMessage('最多预约天数必须在1-365之间'),
  body('time_slots')
    .isArray({ min: 1 })
    .withMessage('时间段数组不能为空'),
  body('time_slots.*.startTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('开始时间格式不正确'),
  body('time_slots.*.endTime')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('结束时间格式不正确'),
  body('is_active')
    .optional()
    .isIn([0, 1])
    .withMessage('启用状态必须是0或1')
];

/**
 * 课程预约验证规则
 */
const courseBookingValidation = [
  body('coach_id')
    .isInt({ min: 1 })
    .withMessage('教练ID必须是正整数'),
  body('course_date')
    .isISO8601({ strict: true })
    .withMessage('课程日期格式不正确'),
  body('start_time')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('开始时间格式不正确'),
  body('end_time')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('结束时间格式不正确'),
  body('location')
    .optional()
    .isLength({ max: 200 })
    .withMessage('地点描述不能超过200个字符'),
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符')
];

/**
 * 课程确认验证规则
 */
const courseConfirmValidation = [
  body('coach_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('教练备注不能超过500个字符')
];

/**
 * 课程取消验证规则
 */
const courseCancelValidation = [
  body('cancel_reason')
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('取消原因不能为空，且不能超过200个字符')
];

/**
 * 关系绑定验证规则
 * 注意：student_id 自动使用当前登录用户，不需要从请求中传递
 */
const relationBindValidation = [
  body('coach_id')
    .isInt({ min: 1 })
    .withMessage('教练ID必须是正整数'),
  body('remaining_lessons')
    .optional()
    .isInt({ min: 0 })
    .withMessage('剩余课时必须是非负整数'),
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符')
];

/**
 * 备注更新验证规则
 */
const remarkUpdateValidation = [
  body('coach_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('教练备注不能超过500个字符'),
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符')
];

/**
 * 分页查询验证规则
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间')
];

/**
 * ID参数验证规则
 */
const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID必须是正整数')
];

module.exports = {
  validateRequest,
  loginValidation,
  updateProfileValidation,
  timeTemplateValidation,
  courseBookingValidation,
  courseConfirmValidation,
  courseCancelValidation,
  relationBindValidation,
  remarkUpdateValidation,
  paginationValidation,
  idParamValidation
}; 