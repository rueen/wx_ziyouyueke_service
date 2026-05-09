const { CoachTag, RelationTag, StudentCoachRelation } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * 教练标签控制器
 */
class TagController {
  /**
   * 获取当前教练的所有标签
   * @route GET /api/h5/tags
   */
  static getTags = asyncHandler(async (req, res) => {
    const coachId = req.user.id;

    const tags = await CoachTag.findAll({
      where: { coach_id: coachId },
      order: [['createdAt', 'ASC']]
    });

    return ResponseUtil.success(res, tags, '获取标签列表成功');
  });

  /**
   * 创建标签
   * @route POST /api/h5/tags
   * @param {string} req.body.name - 标签名称
   */
  static createTag = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return ResponseUtil.validationError(res, '标签名称不能为空');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 30) {
      return ResponseUtil.validationError(res, '标签名称不能超过 30 个字符');
    }

    const [tag, created] = await CoachTag.findOrCreate({
      where: { coach_id: coachId, name: trimmedName },
      defaults: { coach_id: coachId, name: trimmedName }
    });

    if (!created) {
      return ResponseUtil.validationError(res, '该标签名称已存在');
    }

    logger.info('教练创建标签:', { coachId, tagId: tag.id, name: trimmedName });
    return ResponseUtil.success(res, tag, '标签创建成功');
  });

  /**
   * 更新标签名称
   * @route PUT /api/h5/tags/:id
   * @param {string} req.body.name - 新标签名称
   */
  static updateTag = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return ResponseUtil.validationError(res, '标签名称不能为空');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 30) {
      return ResponseUtil.validationError(res, '标签名称不能超过 30 个字符');
    }

    const tag = await CoachTag.findOne({ where: { id, coach_id: coachId } });
    if (!tag) {
      return ResponseUtil.notFound(res, '标签不存在');
    }

    // 检查新名称是否与其他标签重复
    const duplicate = await CoachTag.findOne({
      where: { coach_id: coachId, name: trimmedName }
    });
    if (duplicate && duplicate.id !== tag.id) {
      return ResponseUtil.validationError(res, '该标签名称已存在');
    }

    await tag.update({ name: trimmedName });

    logger.info('教练更新标签:', { coachId, tagId: id, name: trimmedName });
    return ResponseUtil.success(res, tag, '标签更新成功');
  });

  /**
   * 删除标签（同时清除该标签与所有学员的关联）
   * @route DELETE /api/h5/tags/:id
   */
  static deleteTag = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const tag = await CoachTag.findOne({ where: { id, coach_id: coachId } });
    if (!tag) {
      return ResponseUtil.notFound(res, '标签不存在');
    }

    // 删除标签，RelationTag 关联记录通过外键 CASCADE 自动清除
    await tag.destroy();

    logger.info('教练删除标签:', { coachId, tagId: id });
    return ResponseUtil.success(res, null, '标签删除成功');
  });

  /**
   * 设置学员标签（全量替换该学员在当前教练下的标签）
   * @route PUT /api/h5/tags/relation/:relationId
   * @param {number[]} req.body.tag_ids - 标签ID数组
   */
  static setStudentTags = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { relationId } = req.params;
    const { tag_ids = [] } = req.body;

    // 验证师生关系归属
    const relation = await StudentCoachRelation.findOne({
      where: { id: relationId, coach_id: coachId }
    });
    if (!relation) {
      return ResponseUtil.notFound(res, '师生关系不存在');
    }

    if (!Array.isArray(tag_ids)) {
      return ResponseUtil.validationError(res, 'tag_ids 必须为数组');
    }

    // 验证所有标签均属于当前教练
    if (tag_ids.length > 0) {
      const validTags = await CoachTag.findAll({
        where: { id: tag_ids, coach_id: coachId }
      });
      if (validTags.length !== tag_ids.length) {
        return ResponseUtil.validationError(res, '存在无效的标签ID');
      }
    }

    // 全量替换：先删除旧关联，再批量插入新关联
    await RelationTag.destroy({ where: { relation_id: relationId } });

    if (tag_ids.length > 0) {
      await RelationTag.bulkCreate(
        tag_ids.map(tagId => ({ relation_id: relationId, tag_id: tagId })),
        { ignoreDuplicates: true }
      );
    }

    // 返回最新标签列表
    const updatedRelation = await StudentCoachRelation.findByPk(relationId, {
      include: [{ model: CoachTag, as: 'tags', through: { attributes: [] } }]
    });

    logger.info('教练设置学员标签:', { coachId, relationId, tag_ids });
    return ResponseUtil.success(res, { tags: updatedRelation.tags }, '标签设置成功');
  });
}

module.exports = TagController;
