const express = require('express');
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

/**
 * 课程分类路由
 * 所有路由都需要认证
 */

/**
 * @route GET /api/h5/categories
 * @desc 获取教练的课程分类列表
 * @access Private
 */
router.get('/', authenticateToken, CategoryController.getCategories);

/**
 * @route POST /api/h5/categories
 * @desc 添加课程分类
 * @access Private
 * @body {string} name - 分类名称（必填）
 * @body {string} desc - 分类描述（可选）
 */
router.post('/', authenticateToken, CategoryController.addCategory);

/**
 * @route GET /api/h5/categories/:id
 * @desc 获取课程分类详情
 * @access Private
 * @param {number} id - 分类ID
 */
router.get('/:id', authenticateToken, CategoryController.getCategoryDetail);

/**
 * @route PUT /api/h5/categories/:id
 * @desc 编辑课程分类
 * @access Private
 * @param {number} id - 分类ID
 * @body {string} name - 分类名称（必填）
 * @body {string} desc - 分类描述（可选）
 */
router.put('/:id', authenticateToken, CategoryController.updateCategory);

/**
 * @route DELETE /api/h5/categories/:id
 * @desc 删除课程分类
 * @access Private
 * @param {number} id - 分类ID
 * @note 不允许删除默认分类（id=0），且该分类下有学员课时数大于0时不允许删除
 */
router.delete('/:id', authenticateToken, CategoryController.deleteCategory);

module.exports = router;
