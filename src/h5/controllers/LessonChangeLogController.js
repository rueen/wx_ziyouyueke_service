const { LessonChangeLog, StudentCoachRelation, User } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const { Op } = require('sequelize');

/**
 * 课时变动日志控制器
 */
class LessonChangeLogController {
  /**
   * 查询课时变动日志
   * @route GET /api/h5/lesson-change-logs
   *
   * @queryParam {number} relation_id - 师生关系ID（必传）
   * @queryParam {number} [category_id] - 按课程分类筛选
   * @queryParam {1|2|3} [change_type] - 变动类型：1-增加，2-减少，3-清零
   * @queryParam {string} [start_date] - 起始日期 YYYY-MM-DD（含）
   * @queryParam {string} [end_date] - 截止日期 YYYY-MM-DD（含）
   * @queryParam {number} [page=1] - 页码
   * @queryParam {number} [limit=20] - 每页条数（最大 100）
   */
  static getLogs = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      relation_id,
      category_id,
      change_type,
      start_date,
      end_date,
      page = 1,
      limit = 20
    } = req.query;

    if (!relation_id) {
      return ResponseUtil.validationError(res, 'relation_id 为必传参数');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    /** @type {import('sequelize').WhereOptions} */
    const where = { relation_id: parseInt(relation_id, 10) };

    // 课程分类筛选
    if (category_id !== undefined && category_id !== '') {
      where.category_id = parseInt(category_id, 10);
    }

    // 变动类型筛选
    if (change_type) {
      const ct = parseInt(change_type, 10);
      if ([1, 2, 3].includes(ct)) where.change_type = ct;
    }

    // 时间范围筛选
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(`${start_date}T00:00:00+08:00`);
      if (end_date) where.created_at[Op.lte] = new Date(`${end_date}T23:59:59+08:00`);
    }

    const { count, rows } = await LessonChangeLog.findAndCountAll({
      where,
      subQuery: false,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url'],
          required: false
        },
        {
          model: StudentCoachRelation,
          as: 'relation',
          attributes: ['id', 'student_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset
    });

    const list = rows.map(log => ({
      id: log.id,
      relation_id: log.relation_id,
      coach_id: log.coach_id,
      student_id: log.student_id,
      student_name: log.relation ? log.relation.student_name : (log.student ? log.student.nickname : null),
      student_avatar: log.student ? log.student.avatar_url : null,
      category_id: log.category_id,
      change_type: log.change_type,
      change_type_text: { 1: '增加', 2: '减少', 3: '清零' }[log.change_type] || '未知',
      before_lessons: log.before_lessons,
      after_lessons: log.after_lessons,
      change_amount: log.change_amount,
      unit_price: log.unit_price !== null && log.unit_price !== undefined ? parseFloat(log.unit_price) : null,
      operator_id: log.operator_id,
      remark: log.remark,
      created_at: log.created_at
    }));

    return ResponseUtil.success(res, {
      list,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageSize,
        total_pages: Math.ceil(count / pageSize)
      }
    }, '获取课时变动日志成功');
  });
}

module.exports = LessonChangeLogController;
