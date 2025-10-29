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
      const { page = 1, limit = 10, keyword = '' } = req.query;
      const pageNum = Math.max(parseInt(page) || 1, 1);
      const pageSize = Math.max(parseInt(limit) || 10, 1);

      // 构建基础查询条件
      const whereConditions = {
        is_show: 1,
        nickname: { [Op.ne]: '微信用户' }
      };

      // 查询符合条件的用户和已绑定学员的教练ID列表（并行查询以提高性能）
      const [users, coachesWithStudents] = await Promise.all([
        User.findAll({
          where: whereConditions,
          attributes: [
            'id', 'nickname', 'avatar_url', 'phone', 'gender', 'intro',
            'certification', 'motto', 'poster_image', 'course_categories',
            'register_time', 'last_login_time', 'updatedAt'
          ],
          order: [['updatedAt', 'DESC']]
        }),
        StudentCoachRelation.findAll({
          where: { relation_status: 1 },
          attributes: ['coach_id'],
          group: ['coach_id'],
          raw: true
        })
      ]);

      // 获取有学员关系的教练ID集合
      const coachIdsWithStudents = new Set(coachesWithStudents.map(r => r.coach_id));

      // 过滤出教练：满足以下任一条件即为教练
      // 1. 有多个课程分类
      // 2. 只有1个课程分类但name不为"默认"
      // 3. 学员_教练关系表中存在已绑定的学员
      let coaches = users.filter(user => {
        // 条件1和2：检查课程分类
        const categories = user.course_categories || [];
        const matchesCategories = categories.length > 1 || 
          (categories.length === 1 && categories[0].name !== '默认');
        
        // 条件3：检查是否有绑定学员
        const hasStudents = coachIdsWithStudents.has(user.id);
        
        return matchesCategories || hasStudents;
      });

      // 如果有关键词，在所有字段中搜索（包括 course_categories.name）
      if (keyword && keyword.trim()) {
        const keywordLower = keyword.trim().toLowerCase();
        const keywordTrim = keyword.trim();
        coaches = coaches.filter(user => {
          // 检查数据库字段：nickname, certification, intro, phone
          const matchesDBFields = 
            (user.nickname && user.nickname.toLowerCase().includes(keywordLower)) ||
            (user.certification && user.certification.toLowerCase().includes(keywordLower)) ||
            (user.intro && user.intro.toLowerCase().includes(keywordLower)) ||
            (user.phone && user.phone.includes(keywordTrim));
          
          // 检查 course_categories.name（JSON 字段）
          const categories = user.course_categories || [];
          const matchesCategories = categories.some(cat => 
            cat.name && cat.name.toLowerCase().includes(keywordLower)
          );
          
          return matchesDBFields || matchesCategories;
        });
      }

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
