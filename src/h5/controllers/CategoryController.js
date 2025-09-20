const { User, StudentCoachRelation } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 课程分类控制器
 */
class CategoryController {
  /**
   * 获取教练的课程分类列表
   * @route GET /api/h5/categories
   */
  static getCategories = asyncHandler(async (req, res) => {
    const { userId } = req;

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      const categories = user.course_categories || [];
      
      return ResponseUtil.success(res, categories, '获取课程分类成功');
    } catch (error) {
      logger.error('获取课程分类失败:', { userId, error: error.message });
      return ResponseUtil.serverError(res, '获取课程分类失败');
    }
  });

  /**
   * 添加课程分类
   * @route POST /api/h5/categories
   */
  static addCategory = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { name, desc = '' } = req.body;

    try {
      // 参数验证
      if (!name || name.trim() === '') {
        return ResponseUtil.validationError(res, '分类名称不能为空');
      }

      if (name.length > 50) {
        return ResponseUtil.validationError(res, '分类名称不能超过50个字符');
      }

      if (desc && desc.length > 200) {
        return ResponseUtil.validationError(res, '分类描述不能超过200个字符');
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 添加分类
      await user.addCourseCategory(name.trim(), desc.trim());
      
      // 获取新添加的分类ID
      const updatedUser = await User.findByPk(userId);
      const categories = updatedUser.course_categories || [];
      const newCategory = categories[categories.length - 1];

      // 为该教练的所有学员关系添加新分类的课时项
      const relations = await StudentCoachRelation.findAll({
        where: {
          coach_id: userId,
          relation_status: 1
        }
      });

      for (const relation of relations) {
        await relation.addCategoryLesson(newCategory.id);
      }

      logger.info('课程分类添加成功:', { 
        userId, 
        categoryId: newCategory.id,
        categoryName: name,
        affectedRelations: relations.length
      });

      return ResponseUtil.success(res, newCategory, '添加课程分类成功');
    } catch (error) {
      logger.error('添加课程分类失败:', { userId, name, error: error.message });
      
      if (error.message === '分类名称已存在') {
        return ResponseUtil.validationError(res, error.message);
      }
      
      return ResponseUtil.serverError(res, '添加课程分类失败');
    }
  });

  /**
   * 编辑课程分类
   * @route PUT /api/h5/categories/:id
   */
  static updateCategory = asyncHandler(async (req, res) => {
    const { userId } = req;
    const categoryId = parseInt(req.params.id);
    const { name, desc = '' } = req.body;

    try {
      // 参数验证
      if (isNaN(categoryId)) {
        return ResponseUtil.validationError(res, '无效的分类ID');
      }

      if (!name || name.trim() === '') {
        return ResponseUtil.validationError(res, '分类名称不能为空');
      }

      if (name.length > 50) {
        return ResponseUtil.validationError(res, '分类名称不能超过50个字符');
      }

      if (desc && desc.length > 200) {
        return ResponseUtil.validationError(res, '分类描述不能超过200个字符');
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 更新分类
      await user.updateCourseCategory(categoryId, name.trim(), desc.trim());
      
      // 获取更新后的分类信息
      const updatedUser = await User.findByPk(userId);
      const updatedCategory = updatedUser.getCourseCategory(categoryId);

      logger.info('课程分类更新成功:', { 
        userId, 
        categoryId,
        categoryName: name
      });

      return ResponseUtil.success(res, updatedCategory, '更新课程分类成功');
    } catch (error) {
      logger.error('更新课程分类失败:', { userId, categoryId, name, error: error.message });
      
      if (error.message === '分类不存在' || error.message === '分类名称已存在') {
        return ResponseUtil.validationError(res, error.message);
      }
      
      return ResponseUtil.serverError(res, '更新课程分类失败');
    }
  });

  /**
   * 删除课程分类
   * @route DELETE /api/h5/categories/:id
   */
  static deleteCategory = asyncHandler(async (req, res) => {
    const { userId } = req;
    const categoryId = parseInt(req.params.id);

    try {
      // 参数验证
      if (isNaN(categoryId)) {
        return ResponseUtil.validationError(res, '无效的分类ID');
      }

      // 不允许删除默认分类
      if (categoryId === 0) {
        return ResponseUtil.validationError(res, '不允许删除默认分类');
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 检查分类是否存在
      const category = user.getCourseCategory(categoryId);
      if (!category) {
        return ResponseUtil.notFound(res, '分类不存在');
      }

      // 检查该分类下是否有学员的课时数大于0
      const relations = await StudentCoachRelation.findAll({
        where: {
          coach_id: userId,
          relation_status: 1
        }
      });

      let hasLessons = false;
      const relationIds = [];
      
      for (const relation of relations) {
        const lessons = relation.getCategoryLessons(categoryId);
        if (lessons > 0) {
          hasLessons = true;
          relationIds.push(relation.id);
        }
      }

      if (hasLessons) {
        return ResponseUtil.validationError(res, `该分类下还有学员的课时数大于0，不允许删除。相关师生关系ID: ${relationIds.join(', ')}`);
      }

      // 删除用户的课程分类
      await user.deleteCourseCategory(categoryId);

      // 删除所有师生关系中该分类的课时项
      for (const relation of relations) {
        try {
          await relation.removeCategoryLesson(categoryId);
        } catch (error) {
          // 如果删除失败（比如分类不存在），记录日志但不阻断流程
          logger.warn('删除师生关系中的分类课时项失败:', { 
            relationId: relation.id, 
            categoryId, 
            error: error.message 
          });
        }
      }

      logger.info('课程分类删除成功:', { 
        userId, 
        categoryId,
        categoryName: category.name,
        affectedRelations: relations.length
      });

      return ResponseUtil.success(res, null, '删除课程分类成功');
    } catch (error) {
      logger.error('删除课程分类失败:', { userId, categoryId, error: error.message });
      
      if (error.message.includes('不允许删除')) {
        return ResponseUtil.validationError(res, error.message);
      }
      
      return ResponseUtil.serverError(res, '删除课程分类失败');
    }
  });

  /**
   * 获取课程分类详情
   * @route GET /api/h5/categories/:id
   */
  static getCategoryDetail = asyncHandler(async (req, res) => {
    const { userId } = req;
    const categoryId = parseInt(req.params.id);

    try {
      // 参数验证
      if (isNaN(categoryId)) {
        return ResponseUtil.validationError(res, '无效的分类ID');
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseUtil.notFound(res, '用户不存在');
      }

      // 获取分类信息
      const category = user.getCourseCategory(categoryId);
      if (!category) {
        return ResponseUtil.notFound(res, '分类不存在');
      }

      // 统计该分类下的课时数据
      const relations = await StudentCoachRelation.findAll({
        where: {
          coach_id: userId,
          relation_status: 1
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          }
        ]
      });

      const categoryStats = {
        category: category,
        totalStudents: relations.length,
        totalLessons: 0,
        studentLessons: []
      };

      for (const relation of relations) {
        const lessons = relation.getCategoryLessons(categoryId);
        categoryStats.totalLessons += lessons;
        categoryStats.studentLessons.push({
          relationId: relation.id, // 新增：师生关系ID
          studentId: relation.student_id,
          studentName: relation.student?.nickname || '未设置昵称',
          studentAvatar: relation.student?.avatar_url || '',
          remainingLessons: lessons
        });
      }

      return ResponseUtil.success(res, categoryStats, '获取分类详情成功');
    } catch (error) {
      logger.error('获取分类详情失败:', { userId, categoryId, error: error.message });
      return ResponseUtil.serverError(res, '获取分类详情失败');
    }
  });
}

module.exports = CategoryController;
