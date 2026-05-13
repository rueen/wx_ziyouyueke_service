const { TrainingRecord, TrainingRecordType, User, StudentCoachRelation } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 训练记录管理控制器
 */
class TrainingRecordController {
  /**
   * 获取训练记录列表（分页）
   * @route GET /api/h5/training-records
   * @description 教练和学员均可访问。student_id 必填，coach_id 选填。
   *   - 仅传 student_id：当前用户必须是该学员本人，返回其跨教练的全部记录
   *   - 同时传 coach_id：当前用户必须是该学员或该教练之一，返回指定师生对的记录
   */
  static getList = asyncHandler(async (req, res) => {
    const { userId } = req;
    const {
      student_id,
      coach_id,
      type_id,
      start_date,
      end_date,
      page = 1,
      page_size = 20
    } = req.query;

    if (!student_id) {
      return ResponseUtil.validationError(res, 'student_id 为必填参数');
    }

    const studentIdInt = parseInt(student_id);
    const coachIdInt = coach_id ? parseInt(coach_id) : null;

    // 权限校验
    if (coachIdInt) {
      // 传了 coach_id：当前用户必须是学员或教练之一
      if (userId !== studentIdInt && userId !== coachIdInt) {
        return ResponseUtil.forbidden(res, '无权查看该训练记录');
      }
    } else {
      // 未传 coach_id：只有学员本人可查看自己跨教练的全部记录
      if (userId !== studentIdInt) {
        return ResponseUtil.forbidden(res, '无权查看该学员的训练记录');
      }
    }

    try {
      const pageNum = parseInt(page);
      const pageSize = parseInt(page_size);
      const offset = (pageNum - 1) * pageSize;

      const where = { student_id: studentIdInt };

      if (coachIdInt) {
        where.coach_id = coachIdInt;
      }

      // 按类型筛选
      if (type_id) {
        where.type_id = parseInt(type_id);
      }

      // 按创建时间筛选
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(`${start_date} 00:00:00`);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(`${end_date} 23:59:59`);
        }
      }

      const { count, rows } = await TrainingRecord.findAndCountAll({
        where,
        include: [
          {
            model: TrainingRecordType,
            as: 'trainingType',
            attributes: ['id', 'name', 'fields'],
            required: false
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset
      });

      return ResponseUtil.successWithPagination(
        res,
        rows,
        { page: pageNum, limit: pageSize, total: count },
        '获取训练记录列表成功'
      );
    } catch (error) {
      logger.error('获取训练记录列表失败:', {
        userId,
        student_id,
        coach_id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '获取训练记录列表失败');
    }
  });

  /**
   * 获取记录中用到的训练类型列表（用于筛选）
   * @route GET /api/h5/training-records/types
   * @description 返回该学员所有记录中实际用到的类型（去重）。
   *   - student_id 必填，coach_id 选填
   *   - 仅传 student_id：返回跨教练的全部类型
   *   - 同时传 coach_id：仅返回该教练给该学员的记录中用到的类型
   */
  static getTypesInRecords = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { student_id, coach_id } = req.query;

    if (!student_id) {
      return ResponseUtil.validationError(res, 'student_id 为必填参数');
    }

    const studentIdInt = parseInt(student_id);
    const coachIdInt = coach_id ? parseInt(coach_id) : null;

    // 权限校验
    if (coachIdInt) {
      if (userId !== studentIdInt && userId !== coachIdInt) {
        return ResponseUtil.forbidden(res, '无权查看该训练记录');
      }
    } else {
      if (userId !== studentIdInt) {
        return ResponseUtil.forbidden(res, '无权查看该学员的训练记录');
      }
    }

    try {
      const where = {
        student_id: studentIdInt,
        type_id: { [Op.not]: null }
      };

      if (coachIdInt) {
        where.coach_id = coachIdInt;
      }

      // 查询该学员记录中用到的所有 type_id（去重）
      const records = await TrainingRecord.findAll({
        where,
        attributes: ['type_id'],
        group: ['type_id'],
        raw: true
      });

      if (records.length === 0) {
        return ResponseUtil.success(res, [], '获取训练类型列表成功');
      }

      const typeIds = records.map(r => r.type_id);

      // 查询对应的类型详情（包含已软删除的，保证历史记录的类型信息可展示）
      const types = await TrainingRecordType.findAll({
        where: { id: typeIds },
        paranoid: false,
        attributes: ['id', 'name', 'fields'],
        order: [['id', 'ASC']]
      });

      return ResponseUtil.success(res, types, '获取训练类型列表成功');
    } catch (error) {
      logger.error('获取记录类型列表失败:', {
        userId,
        student_id,
        coach_id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '获取记录类型列表失败');
    }
  });

  /**
   * 新增训练记录
   * @route POST /api/h5/training-records
   * @description 仅教练可操作，且目标学员必须与教练存在有效的师生关系
   */
  static create = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { student_id, type_id, type_values, content, images } = req.body;

    try {
      // 验证学员是否存在
      const student = await User.findByPk(student_id);
      if (!student) {
        return ResponseUtil.notFound(res, '学员不存在');
      }

      // 验证师生关系
      const relation = await StudentCoachRelation.findOne({
        where: {
          student_id,
          coach_id: userId,
          relation_status: 1
        }
      });

      if (!relation) {
        return ResponseUtil.businessError(res, 4003, '只能为当前有效关系的学员添加训练记录');
      }

      // 如果传入了 type_id，验证类型是否存在且归属当前教练
      if (type_id) {
        const type = await TrainingRecordType.findByPk(type_id);
        if (!type) {
          return ResponseUtil.notFound(res, '训练类型不存在');
        }
        if (type.coach_id !== userId) {
          return ResponseUtil.forbidden(res, '无权使用该训练类型');
        }
      }

      const record = await TrainingRecord.create({
        student_id,
        coach_id: userId,
        type_id: type_id || null,
        type_values: type_values || null,
        content: content || null,
        images: images || null
      });

      logger.info('训练记录创建成功:', {
        recordId: record.id,
        coachId: userId,
        studentId: student_id,
        timestamp: new Date().toISOString()
      });

      // 返回包含关联信息的完整数据
      const recordWithDetails = await TrainingRecord.findByPk(record.id, {
        include: [
          {
            model: TrainingRecordType,
            as: 'trainingType',
            attributes: ['id', 'name', 'fields'],
            required: false
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url']
          }
        ]
      });

      return ResponseUtil.success(res, recordWithDetails, '训练记录创建成功');
    } catch (error) {
      logger.error('创建训练记录失败:', {
        userId,
        student_id,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '创建训练记录失败');
    }
  });

  /**
   * 编辑训练记录
   * @route PUT /api/h5/training-records/:id
   * @description 仅教练可操作，且只能编辑自己创建的记录
   */
  static update = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const { type_id, type_values, content, images } = req.body;

    try {
      const record = await TrainingRecord.findByPk(id);

      if (!record) {
        return ResponseUtil.notFound(res, '训练记录不存在');
      }

      // 归属校验
      if (record.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权操作该训练记录');
      }

      // 如果传入了 type_id，验证类型是否存在且归属当前教练
      if (type_id !== undefined && type_id !== null) {
        const type = await TrainingRecordType.findByPk(type_id);
        if (!type) {
          return ResponseUtil.notFound(res, '训练类型不存在');
        }
        if (type.coach_id !== userId) {
          return ResponseUtil.forbidden(res, '无权使用该训练类型');
        }
      }

      const updateData = {};
      // 允许将 type_id 置为 null（清除类型）
      if (type_id !== undefined) updateData.type_id = type_id || null;
      if (type_values !== undefined) updateData.type_values = type_values || null;
      if (content !== undefined) updateData.content = content || null;
      if (images !== undefined) updateData.images = images || null;

      await record.update(updateData);

      logger.info('训练记录更新成功:', {
        recordId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      // 返回包含关联信息的完整数据
      const recordWithDetails = await TrainingRecord.findByPk(id, {
        include: [
          {
            model: TrainingRecordType,
            as: 'trainingType',
            attributes: ['id', 'name', 'fields'],
            required: false
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'nickname', 'avatar_url']
          },
          {
            model: User,
            as: 'coach',
            attributes: ['id', 'nickname', 'avatar_url']
          }
        ]
      });

      return ResponseUtil.success(res, recordWithDetails, '训练记录更新成功');
    } catch (error) {
      logger.error('更新训练记录失败:', {
        recordId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '更新训练记录失败');
    }
  });

  /**
   * 删除训练记录（软删除）
   * @route DELETE /api/h5/training-records/:id
   * @description 仅教练可操作，且只能删除自己创建的记录
   */
  static remove = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;

    try {
      const record = await TrainingRecord.findByPk(id);

      if (!record) {
        return ResponseUtil.notFound(res, '训练记录不存在');
      }

      // 归属校验
      if (record.coach_id !== userId) {
        return ResponseUtil.forbidden(res, '无权操作该训练记录');
      }

      await record.destroy();

      logger.info('训练记录删除成功:', {
        recordId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, null, '训练记录删除成功');
    } catch (error) {
      logger.error('删除训练记录失败:', {
        recordId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return ResponseUtil.serverError(res, '删除训练记录失败');
    }
  });
}

module.exports = TrainingRecordController;
