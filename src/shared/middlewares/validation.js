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
    .optional(),
  body('gender')
    .optional()
    .isIn([0, 1, 2])
    .withMessage('性别值必须是0、1或2'),
  body('intro')
    .optional()
    .isLength({ max: 500 })
    .withMessage('个人介绍不能超过500个字符'),
  body('avatar_url')
    .optional()
    .custom((value) => {
      // 自定义URL验证，支持localhost和开发环境
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$|^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?(\/.*)?$/;
      if (!urlRegex.test(value)) {
        throw new Error('头像URL格式不正确');
      }
      return true;
    })
    .isLength({ max: 500 })
    .withMessage('头像URL长度不能超过500个字符'),
  body('certification')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('专业认证不能超过1000个字符'),
  body('motto')
    .optional()
    .isLength({ max: 200 })
    .withMessage('格言不能超过200个字符'),
  body('poster_image')
    .optional()
    .custom((value) => {
      // 自定义URL验证，支持localhost和开发环境
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$|^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:[0-9]+)?(\/.*)?$/;
      if (!urlRegex.test(value)) {
        throw new Error('海报图片URL格式不正确');
      }
      return true;
    })
    .isLength({ max: 500 })
    .withMessage('海报图片URL长度不能超过500个字符')
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
  body('student_id')
    .isInt({ min: 1 })
    .withMessage('学员ID必须是正整数'),
  body('relation_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('师生关系ID必须是正整数'),
  body('course_date')
    .isISO8601({ strict: true })
    .withMessage('课程日期格式不正确'),
  body('start_time')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('开始时间格式不正确'),
  body('end_time')
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('结束时间格式不正确'),
  body('address_id')
    .isInt({ min: 1 })
    .withMessage('地址ID必须是正整数'),
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符'),
  body('coach_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('教练备注不能超过500个字符')
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
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符')
];

/**
 * 师生关系更新验证规则
 */
const relationUpdateValidation = [
  body('coach_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('教练备注不能超过500个字符'),
  body('student_remark')
    .optional()
    .isLength({ max: 500 })
    .withMessage('学员备注不能超过500个字符'),
  body('category_lessons')
    .optional()
    .isArray()
    .withMessage('分类课时必须是数组格式'),
  body('category_lessons.*.category_id')
    .optional()
    .isInt({ min: 0 })
    .withMessage('分类ID必须是非负整数'),
  body('category_lessons.*.remaining_lessons')
    .optional()
    .isInt({ min: 0 })
    .withMessage('分类课时数必须是非负整数'),
  body('remaining_lessons')
    .optional()
    .isInt({ min: 0 })
    .withMessage('课时数必须是非负整数')
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

/**
 * 解密手机号验证规则
 */
const decryptPhoneValidation = [
  body('code')
    .notEmpty()
    .withMessage('微信手机号授权码不能为空')
    .isString()
    .withMessage('微信手机号授权码格式不正确')
];

/**
 * 地址创建验证规则
 */
const addressCreateValidation = [
  body('name')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('地址名称不能为空，长度必须在1-100个字符之间'),
  body('address')
    .notEmpty()
    .isLength({ min: 1, max: 500 })
    .withMessage('详细地址不能为空，长度必须在1-500个字符之间'),
  body('latitude')
    .notEmpty()
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度不能为空，必须在-90到90之间'),
  body('longitude')
    .notEmpty()
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度不能为空，必须在-180到180之间'),
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('是否默认地址必须是布尔值')
];

/**
 * 地址更新验证规则
 */
const addressUpdateValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('地址名称长度必须在1-100个字符之间'),
  body('address')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('详细地址长度必须在1-500个字符之间'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('纬度必须在-90到90之间'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('经度必须在-180到180之间'),
  body('is_default')
    .optional()
    .isBoolean()
    .withMessage('是否默认地址必须是布尔值')
];

// 通用验证中间件别名
const validate = validateRequest;

module.exports = {
  validateRequest,
  validate, // 添加别名
  loginValidation,
  updateProfileValidation,
  timeTemplateValidation,
  courseBookingValidation,
  courseConfirmValidation,
  courseCancelValidation,
  relationBindValidation,
  relationUpdateValidation,
  paginationValidation,
  idParamValidation,
  decryptPhoneValidation,
  addressCreateValidation,
  addressUpdateValidation
}; 