const { User, StudentCoachRelation, Address } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 教练控制器
 */
class CoachController {
  /**
   * 获取所有教练列表
   * @route GET /api/h5/coaches
   * @description 获取符合条件的教练列表，需要登录
   */
  static getCoaches = asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const pageSize = Math.max(parseInt(limit) || 10, 1);

      // 查询符合条件的用户
      const users = await User.findAll({
        where: {
          is_show: 1,
          phone: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
          [Op.or]: [
            { intro: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } },
            { certification: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] } }
          ]
        },
        attributes: [
          'id', 'nickname', 'avatar_url', 'phone', 'gender', 'intro',
          'certification', 'motto', 'poster_image', 'course_categories',
          'register_time', 'last_login_time', 'updatedAt'
        ],
        order: [['updatedAt', 'DESC']]
      });

      // 过滤出教练：有多个分类，或只有1个但name不为"默认"
      const coaches = users.filter(user => {
        const categories = user.course_categories || [];
        return categories.length > 1 || (categories.length === 1 && categories[0].name !== '默认');
      });

      // 获取每个教练的统计信息
      const coachesWithStats = await Promise.all(coaches.map(async (coach) => {
        const [studentCount, firstAddress] = await Promise.all([
          StudentCoachRelation.count({
            where: { coach_id: coach.id, relation_status: 1 }
          }),
          Address.findOne({
            where: { user_id: coach.id },
            order: [['createdAt', 'ASC']],
            attributes: ['address']
          })
        ]);

        // 提取城市信息
        const city = firstAddress?.address?.match(/(.+?市)|(.+?省)/)?.[0] || '';

        // 计算信息完善度评分
        const completenessScore = [
          coach.phone, coach.intro, coach.certification,
          coach.motto, coach.poster_image
        ].filter(Boolean).length;

        return {
          ...coach.toJSON(),
          city,
          student_count: studentCount,
          completeness_score: completenessScore,
          updated_at: coach.updatedAt
        };
      }));

      // 排序：信息完善度 > 学员数量 > 更新时间
      coachesWithStats.sort((a, b) =>
        b.completeness_score - a.completeness_score ||
        b.student_count - a.student_count ||
        new Date(b.updated_at) - new Date(a.updated_at)
      );

      // 分页
      const total = coachesWithStats.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (pageNum - 1) * pageSize;

      return ResponseUtil.success(res, {
        list: coachesWithStats.slice(offset, offset + pageSize),
        total,
        totalPages,
        page: pageNum,
        pageSize,
      }, '获取教练列表成功');
    } catch (error) {
      logger.error('获取教练列表失败:', error);
      return ResponseUtil.serverError(res, '获取教练列表失败');
    }
  });
}

module.exports = CoachController;
