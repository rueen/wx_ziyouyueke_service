const { TrainingRecordType } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/** 每个教练最多可创建的类型数量 */
const MAX_TYPES_PER_COACH = 10;
/** 每个类型最多可添加的字段数量 */
const MAX_FIELDS_PER_TYPE = 20;

/**
 * 训练类型管理控制器
 */
class TrainingRecordTypeController {
  /**
   * 获取训练类型列表（不分页，返回当前教练的全部类型）
   * @route GET /api/h5/training-record-types
   */
  static getList = asyncHandler(async (req, res) => {
    const { userId } = req;

    try {
      const list = await TrainingRecordType.findAll({
        where: { coach_id: userId },
        order: [['created_at', 'ASC']]
      });

      return ResponseUtil.success(res, list, '获取训练类型列表成功');
    } catch (error) {
      logger.error('获取训练类型列表失败:', {
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '获取训练类型列表失败');
    }
  });

  /**
   * 新增训练类型
   * @route POST /api/h5/training-record-types
   */
  static create = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { name, fields = [] } = req.body;

    try {
      // 检查当前教练类型数量上限
      const existingCount = await TrainingRecordType.count({
        where: { coach_id: userId }
      });

      if (existingCount >= MAX_TYPES_PER_COACH) {
        return ResponseUtil.businessError(res, 4001, `每位教练最多可创建${MAX_TYPES_PER_COACH}个训练类型`);
      }

      // 检查字段数量上限
      if (fields.length > MAX_FIELDS_PER_TYPE) {
        return ResponseUtil.validationError(res, `每个类型最多可添加${MAX_FIELDS_PER_TYPE}个字段`);
      }

      // 检查同名类型（同一教练下）
      const duplicate = await TrainingRecordType.findOne({
        where: { coach_id: userId, name }
      });

      if (duplicate) {
        return ResponseUtil.businessError(res, 4002, '已存在同名训练类型');
      }

      const type = await TrainingRecordType.create({
        coach_id: userId,
        name,
        fields
      });

      logger.info('训练类型创建成功:', {
        typeId: type.id,
        coachId: userId,
        name,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, type, '训练类型创建成功');
    } catch (error) {
      logger.error('创建训练类型失败:', {
        userId,
        name,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '创建训练类型失败');
    }
  });

  /**
   * 编辑训练类型
   * @route PUT /api/h5/training-record-types/:id
   */
  static update = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const { name, fields } = req.body;

    try {
      const type = await TrainingRecordType.findByPk(id);

      if (!type) {
        return ResponseUtil.notFound(res, '训练类型不存在');
      }

      // 归属校验
      if (type.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权操作该训练类型');
      }

      // 检查字段数量上限
      if (fields !== undefined && fields.length > MAX_FIELDS_PER_TYPE) {
        return ResponseUtil.validationError(res, `每个类型最多可添加${MAX_FIELDS_PER_TYPE}个字段`);
      }

      // 检查同名类型（排除自身）
      if (name !== undefined && name !== type.name) {
        const duplicate = await TrainingRecordType.findOne({
          where: { coach_id: userId, name }
        });
        if (duplicate) {
          return ResponseUtil.businessError(res, 4002, '已存在同名训练类型');
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (fields !== undefined) updateData.fields = fields;

      await type.update(updateData);

      logger.info('训练类型更新成功:', {
        typeId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, type, '训练类型更新成功');
    } catch (error) {
      logger.error('更新训练类型失败:', {
        typeId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '更新训练类型失败');
    }
  });

  /**
   * 删除训练类型（软删除）
   * @route DELETE /api/h5/training-record-types/:id
   */
  static remove = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;

    try {
      const type = await TrainingRecordType.findByPk(id);

      if (!type) {
        return ResponseUtil.notFound(res, '训练类型不存在');
      }

      // 归属校验
      if (type.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权操作该训练类型');
      }

      // 软删除（paranoid: true 时 destroy() 即为软删除）
      await type.destroy();

      logger.info('训练类型删除成功:', {
        typeId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, null, '训练类型删除成功');
    } catch (error) {
      logger.error('删除训练类型失败:', {
        typeId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '删除训练类型失败');
    }
  });
}

module.exports = TrainingRecordTypeController;
