const {
  CourseBooking,
  GroupCourseRegistration,
  StudentCoachRelation,
  StudentCardInstance,
  CoachCard,
  User,
  sequelize
} = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const { Op } = require('sequelize');

/**
 * 获取日期范围 WHERE 条件
 * @param {string} [startDate] - YYYY-MM-DD
 * @param {string} [endDate] - YYYY-MM-DD
 * @param {string} field - 时间字段名
 * @returns {import('sequelize').WhereOptions}
 */
function buildDateWhere(startDate, endDate, field) {
  if (!startDate && !endDate) return {};
  const cond = {};
  if (startDate) cond[Op.gte] = new Date(`${startDate}T00:00:00+08:00`);
  if (endDate) cond[Op.lte] = new Date(`${endDate}T23:59:59+08:00`);
  return { [field]: cond };
}

/**
 * 解析学员 ID 列表
 * @param {string|undefined} studentIds - 逗号分隔的 ID 字符串
 * @returns {number[]|null}
 */
function parseStudentIds(studentIds) {
  if (!studentIds) return null;
  const ids = String(studentIds).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  return ids.length > 0 ? ids : null;
}

/**
 * 数据统计控制器
 */
class StatController {
  /**
   * 总览统计（已消课时、消课收入、剩余课时、未消课金额）
   * @route GET /api/h5/stats/overview
   *
   * @queryParam {string} [student_ids] - 逗号分隔学员ID，不传统计全部
   * @queryParam {string} [start_date] - 起始日期 YYYY-MM-DD
   * @queryParam {string} [end_date] - 截止日期 YYYY-MM-DD
   * @queryParam {number} [category_id] - 按课程分类过滤（常规课）
   * @queryParam {number} [card_id] - 按卡片模板 ID 过滤（课程卡）
   */
  static getOverview = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { start_date, end_date, category_id, card_id, student_ids } = req.query;

    const filterStudentIds = parseStudentIds(student_ids);
    const filterCategoryId = category_id !== undefined ? parseInt(category_id, 10) : null;
    const filterCardId = card_id !== undefined ? parseInt(card_id, 10) : null;

    // === 一、已消课时数 & 消课收入（受时间约束）===

    let completedLessons = 0;
    let completedRevenue = 0;

    // 1-1 普通课（booking_type=1）
    if (!filterCardId) {
      const bookingWhere = {
        coach_id: coachId,
        booking_type: 1,
        booking_status: 3, // 已完成
        ...buildDateWhere(start_date, end_date, 'complete_at')
      };
      if (filterStudentIds) bookingWhere.student_id = { [Op.in]: filterStudentIds };
      if (filterCategoryId !== null) bookingWhere.category_id = filterCategoryId;

      const regularBookings = await CourseBooking.findAll({
        where: bookingWhere,
        attributes: ['id', 'student_id', 'relation_id', 'category_id', 'lesson_deducted'],
        raw: true
      });

      // 批量获取关联的师生关系（含 lessons JSON）
      const relationIds = [...new Set(regularBookings.map(b => b.relation_id).filter(Boolean))];
      const relations = relationIds.length > 0
        ? await StudentCoachRelation.findAll({
            where: { id: { [Op.in]: relationIds } },
            attributes: ['id', 'lessons'],
            raw: true
          })
        : [];
      const relationMap = Object.fromEntries(relations.map(r => [r.id, r]));

      // 获取教练课程分类单价
      const coach = await User.findByPk(coachId, { attributes: ['id', 'course_categories'] });
      const categories = coach ? (coach.course_categories || []) : [];

      for (const booking of regularBookings) {
        const deducted = booking.lesson_deducted !== null ? booking.lesson_deducted : 1;
        completedLessons += deducted;

        // 取课单价：先看 relation.lessons[].unit_price，再看 coach.course_categories[].unit_price
        const rel = relationMap[booking.relation_id];
        const relLessons = rel ? (typeof rel.lessons === 'string' ? JSON.parse(rel.lessons) : (rel.lessons || [])) : [];
        const relEntry = relLessons.find(l => Number(l.category_id) === Number(booking.category_id));
        const catDef = categories.find(c => Number(c.id) === Number(booking.category_id));

        let unitPrice = 0;
        if (relEntry && relEntry.unit_price !== undefined && relEntry.unit_price !== null) {
          unitPrice = parseFloat(relEntry.unit_price);
        } else if (catDef && catDef.unit_price !== undefined && catDef.unit_price !== null) {
          unitPrice = parseFloat(catDef.unit_price);
        }
        completedRevenue += deducted * unitPrice;
      }
    }

    // 1-2 卡片私教课（booking_type=2）
    if (!filterCategoryId) {
      const cardBookingWhere = {
        coach_id: coachId,
        booking_type: 2,
        booking_status: 3,
        ...buildDateWhere(start_date, end_date, 'complete_at')
      };
      if (filterStudentIds) cardBookingWhere.student_id = { [Op.in]: filterStudentIds };
      if (filterCardId) cardBookingWhere['$cardInstance.coach_card_id$'] = filterCardId;

      const cardBookings = await CourseBooking.findAll({
        where: cardBookingWhere,
        attributes: ['id', 'lesson_deducted', 'card_instance_id'],
        include: [
          {
            model: StudentCardInstance,
            as: 'cardInstance',
            attributes: ['id', 'unit_price', 'coach_card_id'],
            include: [
              {
                model: CoachCard,
                as: 'coachCard',
                attributes: ['id', 'unit_price'],
                paranoid: false
              }
            ],
            required: false
          }
        ]
      });

      for (const booking of cardBookings) {
        const deducted = booking.lesson_deducted !== null ? booking.lesson_deducted : 1;
        completedLessons += deducted;

        const instance = booking.cardInstance;
        let unitPrice = 0;
        if (instance) {
          if (instance.unit_price !== null && instance.unit_price !== undefined) {
            unitPrice = parseFloat(instance.unit_price);
          } else if (instance.coachCard && instance.coachCard.unit_price !== null) {
            unitPrice = parseFloat(instance.coachCard.unit_price || 0);
          }
        }
        completedRevenue += deducted * unitPrice;
      }
    }

    // 1-3 团课签到（check_in_status=1）
    if (!filterCategoryId) {
      const gcWhere = {
        coach_id: coachId,
        check_in_status: 1,
        ...buildDateWhere(start_date, end_date, 'check_in_time')
      };
      if (filterStudentIds) gcWhere.student_id = { [Op.in]: filterStudentIds };
      if (filterCardId) gcWhere['$cardInstance.coach_card_id$'] = filterCardId;

      const gcRegs = await GroupCourseRegistration.findAll({
        where: gcWhere,
        attributes: ['id', 'payment_type', 'lesson_deducted', 'card_instance_id'],
        include: [
          {
            model: StudentCardInstance,
            as: 'cardInstance',
            attributes: ['id', 'unit_price', 'coach_card_id'],
            include: [
              {
                model: CoachCard,
                as: 'coachCard',
                attributes: ['id', 'unit_price'],
                paranoid: false
              }
            ],
            required: false
          }
        ]
      });

      for (const reg of gcRegs) {
        if (reg.payment_type === 4 && reg.card_instance_id) {
          // 卡片课扣减
          const deducted = reg.lesson_deducted !== null ? reg.lesson_deducted : 1;
          completedLessons += deducted;

          const instance = reg.cardInstance;
          let unitPrice = 0;
          if (instance) {
            if (instance.unit_price !== null && instance.unit_price !== undefined) {
              unitPrice = parseFloat(instance.unit_price);
            } else if (instance.coachCard && instance.coachCard.unit_price !== null) {
              unitPrice = parseFloat(instance.coachCard.unit_price || 0);
            }
          }
          completedRevenue += deducted * unitPrice;
        } else if (reg.payment_type === 1) {
          // 普通课时扣减（团课）
          const deducted = reg.lesson_deducted !== null ? reg.lesson_deducted : 1;
          completedLessons += deducted;
          // 团课普通课时无直接单价关联，revenue 按 0 处理
        }
      }
    }

    // === 二、剩余课时数 & 未消课金额（不受时间约束）===
    let remainingLessons = 0;
    let remainingRevenue = 0;

    // 2-1 常规课剩余课时
    if (!filterCardId) {
      const relWhere = { coach_id: coachId, relation_status: 1 };
      if (filterStudentIds) relWhere.student_id = { [Op.in]: filterStudentIds };

      const rels = await StudentCoachRelation.findAll({
        where: relWhere,
        attributes: ['id', 'student_id', 'lessons']
      });

      const coach = await User.findByPk(coachId, { attributes: ['id', 'course_categories'] });
      const categories = coach ? (coach.course_categories || []) : [];

      for (const rel of rels) {
        const lessonArr = rel.lessons || [];
        for (const entry of lessonArr) {
          if (entry.is_cleared) continue;
          if (filterCategoryId !== null && Number(entry.category_id) !== filterCategoryId) continue;

          const remaining = entry.remaining_lessons || 0;
          remainingLessons += remaining;

          // 取单价
          let unitPrice = 0;
          if (entry.unit_price !== undefined && entry.unit_price !== null) {
            unitPrice = parseFloat(entry.unit_price);
          } else {
            const catDef = categories.find(c => Number(c.id) === Number(entry.category_id));
            if (catDef && catDef.unit_price !== undefined && catDef.unit_price !== null) {
              unitPrice = parseFloat(catDef.unit_price);
            }
          }
          remainingRevenue += remaining * unitPrice;
        }
      }
    }

    // 2-2 卡片课剩余课时（有效状态：0-未开启，1-已开启）
    if (!filterCategoryId) {
      const cardWhere = {
        coach_id: coachId,
        card_status: { [Op.in]: [0, 1] }
      };
      if (filterStudentIds) cardWhere.student_id = { [Op.in]: filterStudentIds };
      if (filterCardId) cardWhere.coach_card_id = filterCardId;

      const instances = await StudentCardInstance.findAll({
        where: cardWhere,
        attributes: ['id', 'remaining_lessons', 'deduct_lessons_per_use', 'unit_price', 'coach_card_id'],
        include: [
          {
            model: CoachCard,
            as: 'coachCard',
            attributes: ['id', 'unit_price'],
            paranoid: false
          },
          {
            model: StudentCoachRelation,
            as: 'relation',
            attributes: ['id', 'relation_status'],
            required: true, // INNER JOIN，过滤掉关系已删除的卡片
            where: { relation_status: 1 }
          }
        ]
      });

      for (const inst of instances) {
        if (inst.remaining_lessons === null) continue; // 无限次数卡不统计

        const deductPerUse = inst.deduct_lessons_per_use || 1;
        const remaining = inst.remaining_lessons || 0;
        // 剩余课时 = 剩余 card lessons / deductPerUse（向下取整，代表还能用几次）
        // 或直接用 remaining_lessons 字段作为实际剩余
        remainingLessons += remaining;

        let unitPrice = 0;
        if (inst.unit_price !== null && inst.unit_price !== undefined) {
          unitPrice = parseFloat(inst.unit_price);
        } else if (inst.coachCard && inst.coachCard.unit_price !== null) {
          unitPrice = parseFloat(inst.coachCard.unit_price || 0);
        }
        // 未消课金额 = 可使用次数 × 每次扣减课时数 × 课单价
        const usableTimes = deductPerUse > 0 ? Math.floor(remaining / deductPerUse) : 0;
        remainingRevenue += usableTimes * deductPerUse * unitPrice;
      }
    }

    return ResponseUtil.success(res, {
      completed_lessons: completedLessons,
      completed_revenue: Math.round(completedRevenue * 100) / 100,
      remaining_lessons: remainingLessons,
      remaining_revenue: Math.round(remainingRevenue * 100) / 100
    }, '获取统计总览成功');
  });

  /**
   * 消课排行榜
   * @route GET /api/h5/stats/completion-ranking
   *
   * @queryParam {string} [start_date] - 起始日期 YYYY-MM-DD
   * @queryParam {string} [end_date] - 截止日期 YYYY-MM-DD
   * @queryParam {number} [limit=20] - 返回前 N 名（最大 100）
   */
  static getCompletionRanking = asyncHandler(async (req, res) => {
    const coachId = req.user.id;
    const { start_date, end_date, limit = 20 } = req.query;
    const topN = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const dateWhereComplete = buildDateWhere(start_date, end_date, 'complete_at');
    const dateWhereCheckin = buildDateWhere(start_date, end_date, 'check_in_time');

    // 1. 先获取该教练的所有有效师生关系，确保消课数为 0 的学员也出现在结果中
    const allRelations = await StudentCoachRelation.findAll({
      where: { coach_id: coachId, relation_status: 1 },
      attributes: ['student_id', 'student_name'],
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'nickname', 'avatar_url'],
          required: false
        }
      ]
    });

    /** @type {Map<number, number>} studentId -> completedLessons */
    const studentLessonMap = new Map();
    /** @type {Map<number, {student_name: string, avatar_url: string}>} */
    const studentInfoMap = new Map();

    for (const rel of allRelations) {
      studentLessonMap.set(rel.student_id, 0);
      studentInfoMap.set(rel.student_id, {
        student_name: rel.student_name || (rel.student ? rel.student.nickname : null) || '未知学员',
        avatar_url: rel.student ? rel.student.avatar_url : null
      });
    }

    // 2. 叠加普通课 + 卡片私教课消课数
    const bookings = await CourseBooking.findAll({
      where: {
        coach_id: coachId,
        booking_status: 3,
        ...dateWhereComplete
      },
      attributes: ['student_id', 'lesson_deducted'],
      raw: true
    });

    for (const b of bookings) {
      const deducted = b.lesson_deducted !== null ? b.lesson_deducted : 1;
      studentLessonMap.set(b.student_id, (studentLessonMap.get(b.student_id) || 0) + deducted);
    }

    // 3. 叠加团课签到消课数
    const gcRegs = await GroupCourseRegistration.findAll({
      where: {
        coach_id: coachId,
        check_in_status: 1,
        ...dateWhereCheckin
      },
      attributes: ['student_id', 'lesson_deducted'],
      raw: true
    });

    for (const reg of gcRegs) {
      const deducted = reg.lesson_deducted !== null ? reg.lesson_deducted : 1;
      studentLessonMap.set(reg.student_id, (studentLessonMap.get(reg.student_id) || 0) + deducted);
    }

    // 4. 排序取前 N（消课数相同时按 studentId 稳定排序）
    const sorted = [...studentLessonMap.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, topN);

    const list = sorted.map(([studentId, lessons], index) => {
      const info = studentInfoMap.get(studentId) || { student_name: '未知学员', avatar_url: null };
      return {
        rank: index + 1,
        student_id: studentId,
        student_name: info.student_name,
        avatar_url: info.avatar_url,
        completed_lessons: lessons
      };
    });

    return ResponseUtil.success(res, { list }, '获取消课排行榜成功');
  });

}

module.exports = StatController;
