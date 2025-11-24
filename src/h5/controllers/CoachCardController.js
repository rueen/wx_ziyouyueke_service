const { CoachCard, StudentCardInstance } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');

/**
 * 教练卡片模板控制器
 */
class CoachCardController {
  /**
   * 获取我的卡片模板列表
   * @route GET /api/h5/coach-cards
   */
  static getMyCards = asyncHandler(async (req, res) => {
    const coachId = req.user.id;

    const cards = await CoachCard.findAll({
      where: {
        coach_id: coachId
      },
      order: [
        ['is_active', 'DESC'], // 启用的在前
        ['createdAt', 'DESC']
      ]
    });

    const cardList = cards.map(card => card.getSummary());

    return ResponseUtil.success(res, {
      list: cardList,
      total: cardList.length
    }, '获取卡片模板列表成功');
  });

  /**
   * 创建卡片模板
   * @route POST /api/h5/coach-cards
   */
  static createCard = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { 
      card_name, 
      card_color, 
      card_lessons, // null 表示无限次数
      valid_days,
      card_desc 
    } = req.body;

    // 参数验证
    if (!card_name || !card_color || !valid_days) {
      return ResponseUtil.validationError(res, '缺少必要参数');
    }

    // 验证有效天数
    if (typeof valid_days !== 'number' || valid_days <= 0) {
      return ResponseUtil.validationError(res, '有效天数必须大于0');
    }

    // 验证课时数（如果不是无限次数）
    if (card_lessons !== null && card_lessons !== undefined) {
      if (typeof card_lessons !== 'number' || card_lessons <= 0) {
        return ResponseUtil.validationError(res, '课时数必须大于0');
      }
    }

    // 创建卡片模板
    const card = await CoachCard.create({
      coach_id: coachId,
      card_name,
      card_color,
      card_lessons: card_lessons || null, // 如果为空或0，设为null表示无限次数
      valid_days,
      card_desc: card_desc || null,
      is_active: 1 // 默认启用
    });

    logger.info('卡片模板创建成功:', {
      cardId: card.id,
      coachId,
      cardName: card_name
    });

    return ResponseUtil.success(res, card.getSummary(), '卡片模板创建成功');
  });

  /**
   * 编辑卡片模板
   * @route PUT /api/h5/coach-cards/:id
   */
  static updateCard = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;
    const { 
      card_name, 
      card_color, 
      card_lessons,
      valid_days,
      card_desc 
    } = req.body;

    const card = await CoachCard.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!card) {
      return ResponseUtil.notFound(res, '卡片模板不存在或无权限操作');
    }

    // 更新字段
    const updateData = {};
    if (card_name !== undefined) updateData.card_name = card_name;
    if (card_color !== undefined) updateData.card_color = card_color;
    if (card_lessons !== undefined) updateData.card_lessons = card_lessons || null;
    if (valid_days !== undefined) {
      if (typeof valid_days !== 'number' || valid_days <= 0) {
        return ResponseUtil.validationError(res, '有效天数必须大于0');
      }
      updateData.valid_days = valid_days;
    }
    if (card_desc !== undefined) updateData.card_desc = card_desc;

    if (Object.keys(updateData).length === 0) {
      return ResponseUtil.validationError(res, '没有可更新的字段');
    }

    await card.update(updateData);

    logger.info('卡片模板更新成功:', {
      cardId: card.id,
      coachId,
      updateData
    });

    return ResponseUtil.success(res, card.getSummary(), '卡片模板更新成功');
  });

  /**
   * 启用/禁用卡片模板
   * @route PUT /api/h5/coach-cards/:id/toggle-active
   */
  static toggleActive = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const card = await CoachCard.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!card) {
      return ResponseUtil.notFound(res, '卡片模板不存在或无权限操作');
    }

    try {
      if (card.is_active === 1) {
        await card.disable();
        logger.info('卡片模板禁用成功:', { cardId: card.id, coachId });
        return ResponseUtil.success(res, card.getSummary(), '卡片模板已禁用');
      } else {
        await card.enable();
        logger.info('卡片模板启用成功:', { cardId: card.id, coachId });
        return ResponseUtil.success(res, card.getSummary(), '卡片模板已启用');
      }
    } catch (error) {
      logger.error('切换卡片模板状态失败:', { cardId: id, error: error.message });
      return ResponseUtil.validationError(res, error.message);
    }
  });

  /**
   * 删除卡片模板（软删除）
   * @route DELETE /api/h5/coach-cards/:id
   */
  static deleteCard = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const card = await CoachCard.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!card) {
      return ResponseUtil.notFound(res, '卡片模板不存在或无权限操作');
    }

    // 检查是否可以删除
    const { canDelete, reason, forceDelete } = await card.canDelete();
    
    if (!canDelete) {
      return ResponseUtil.validationError(res, reason);
    }

    // 根据是否有关联数据决定删除方式
    if (forceDelete) {
      // 没有任何实例，物理删除（彻底清除）
      await card.destroy({ force: true });
      logger.info('卡片模板物理删除成功（无关联数据）:', {
        cardId: card.id,
        coachId
      });
    } else {
      // 有实例，软删除（保持数据完整性）
      await card.destroy();
      logger.info('卡片模板软删除成功（有关联数据）:', {
        cardId: card.id,
        coachId
      });
    }

    return ResponseUtil.success(res, null, '卡片模板删除成功');
  });

  /**
   * 获取卡片模板详情
   * @route GET /api/h5/coach-cards/:id
   */
  static getCardDetail = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { id } = req.params;

    const card = await CoachCard.findOne({
      where: {
        id,
        coach_id: coachId
      }
    });

    if (!card) {
      return ResponseUtil.notFound(res, '卡片模板不存在或无权限查看');
    }

    // 统计使用该模板的学员数量
    const instanceCount = await StudentCardInstance.count({
      where: {
        coach_card_id: id
      }
    });

    const cardDetail = {
      ...card.getSummary(),
      instance_count: instanceCount // 使用该模板的学员数量
    };

    return ResponseUtil.success(res, cardDetail, '获取卡片模板详情成功');
  });

  /**
   * 获取启用的卡片模板列表（用于添加卡片实例）
   * @route GET /api/h5/coach-cards/active-list
   */
  static getActiveCards = asyncHandler(async (req, res) => {
    const coachId = req.user.id;

    const cards = await CoachCard.findAll({
      where: {
        coach_id: coachId,
        is_active: 1 // 只返回启用的卡片
      },
      order: [['createdAt', 'DESC']]
    });

    const cardList = cards.map(card => card.getSummary());

    return ResponseUtil.success(res, {
      list: cardList,
      total: cardList.length
    }, '获取启用的卡片模板列表成功');
  });
}

module.exports = CoachCardController;

