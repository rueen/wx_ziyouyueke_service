const { CourseContent, CourseBooking, GroupCourse, User } = require('../../shared/models');
const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const logger = require('../../shared/utils/logger');
const { Op } = require('sequelize');

/**
 * 课程内容管理控制器
 */
class CourseContentController {
  /**
   * 添加课程内容
   * @route POST /api/h5/course-content
   */
  static createCourseContent = asyncHandler(async (req, res) => {
    const { userId } = req;
    const {
      course_type,      // 1-一对一，2-团课
      booking_id,       // 一对一课程ID
      group_course_id,  // 团课ID
      text_content,     // 文本内容
      images,           // 图片URL数组
      audios,           // 音频数组 [{"url": "xxx", "duration": 60}]
      videos            // 视频数组 [{"url": "xxx", "duration": 120}]
    } = req.body;

    // 参数验证
    if (!course_type || (course_type !== 1 && course_type !== 2)) {
      return ResponseUtil.validationError(res, '课程类型错误，必须为1（一对一）或2（团课）');
    }

    if (course_type === 1 && !booking_id) {
      return ResponseUtil.validationError(res, '一对一课程必须提供booking_id');
    }

    if (course_type === 2 && !group_course_id) {
      return ResponseUtil.validationError(res, '团课必须提供group_course_id');
    }

    try {
      let course = null;
      let coach_id = null;

      // 验证课程是否存在，并检查权限和状态
      if (course_type === 1) {
        course = await CourseBooking.findByPk(booking_id);
        if (!course) {
          return ResponseUtil.businessError(res, 4004, '预约课程不存在');
        }

        coach_id = course.coach_id;

        // 检查是否是教练本人
        if (coach_id !== userId) {
          return ResponseUtil.businessError(res, 1003, '只有教练本人可以添加课程内容');
        }

        // 检查课程状态（只有已完成的课程才能添加内容）
        if (course.booking_status !== 3) {
          return ResponseUtil.businessError(res, 4000, '只有已完成的课程才能添加内容');
        }

        // 检查是否已存在课程内容
        const existingContent = await CourseContent.findOne({
          where: {
            course_type: 1,
            booking_id: booking_id
          }
        });

        if (existingContent) {
          return ResponseUtil.businessError(res, 4000, '该课程已存在内容记录，请使用编辑功能');
        }
      } else {
        course = await GroupCourse.findByPk(group_course_id);
        if (!course) {
          return ResponseUtil.businessError(res, 4004, '团课不存在');
        }

        coach_id = course.coach_id;

        // 检查是否是教练本人
        if (coach_id !== userId) {
          return ResponseUtil.businessError(res, 1003, '只有教练本人可以添加课程内容');
        }

        // 检查课程状态（只有已结束的课程才能添加内容）
        if (course.status !== 2) {
          return ResponseUtil.businessError(res, 4000, '只有已结束的团课才能添加内容');
        }

        // 检查是否已存在课程内容
        const existingContent = await CourseContent.findOne({
          where: {
            course_type: 2,
            group_course_id: group_course_id
          }
        });

        if (existingContent) {
          return ResponseUtil.businessError(res, 4000, '该团课已存在内容记录，请使用编辑功能');
        }
      }

      // 验证至少有一项内容
      if (!text_content && (!images || images.length === 0) && 
          (!audios || audios.length === 0) && (!videos || videos.length === 0)) {
        return ResponseUtil.validationError(res, '至少需要填写一项内容（文本、图片、音频或视频）');
      }

      // 创建课程内容
      const courseContent = await CourseContent.create({
        course_type,
        booking_id: course_type === 1 ? booking_id : null,
        group_course_id: course_type === 2 ? group_course_id : null,
        coach_id,
        text_content: text_content || null,
        images: images && images.length > 0 ? images : null,
        audios: audios && audios.length > 0 ? audios : null,
        videos: videos && videos.length > 0 ? videos : null
      });

      logger.info('课程内容创建成功:', {
        contentId: courseContent.id,
        courseType: course_type,
        bookingId: booking_id,
        groupCourseId: group_course_id,
        coachId: coach_id,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, courseContent, '课程内容添加成功');

    } catch (error) {
      logger.error('创建课程内容失败:', {
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '创建课程内容失败');
    }
  });

  /**
   * 编辑课程内容
   * @route PUT /api/h5/course-content/:id
   */
  static updateCourseContent = asyncHandler(async (req, res) => {
    const { userId } = req;
    const { id } = req.params;
    const {
      text_content,
      images,
      audios,
      videos
    } = req.body;

    // 查找课程内容
    const courseContent = await CourseContent.findByPk(id);
    if (!courseContent) {
      return ResponseUtil.businessError(res, 4004, '课程内容不存在');
    }

    // 检查权限（只有教练本人可以编辑）
    if (courseContent.coach_id !== userId) {
      return ResponseUtil.businessError(res, 1003, '只有教练本人可以编辑课程内容');
    }

    try {
      // 更新数据
      const updateData = {};
      
      // 允许清空内容（传null或空数组）
      if (text_content !== undefined) {
        updateData.text_content = text_content || null;
      }
      
      if (images !== undefined) {
        updateData.images = images && images.length > 0 ? images : null;
      }
      
      if (audios !== undefined) {
        updateData.audios = audios && audios.length > 0 ? audios : null;
      }
      
      if (videos !== undefined) {
        updateData.videos = videos && videos.length > 0 ? videos : null;
      }

      // 更新课程内容
      await courseContent.update(updateData);

      logger.info('课程内容更新成功:', {
        contentId: id,
        coachId: userId,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.success(res, courseContent, '课程内容更新成功');

    } catch (error) {
      logger.error('更新课程内容失败:', {
        contentId: id,
        userId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return ResponseUtil.serverError(res, '更新课程内容失败');
    }
  });

  /**
   * 获取课程内容详情
   * @route GET /api/h5/course-content/:id
   */
  static getCourseContent = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const courseContent = await CourseContent.findByPk(id);
    if (!courseContent) {
      return ResponseUtil.businessError(res, 4004, '课程内容不存在');
    }

    return ResponseUtil.success(res, courseContent);
  });

  /**
   * 根据课程ID获取课程内容
   * @route GET /api/h5/course-content/by-course
   */
  static getCourseContentByCourseId = asyncHandler(async (req, res) => {
    const { course_type, booking_id, group_course_id } = req.query;

    if (!course_type) {
      return ResponseUtil.validationError(res, '必须提供course_type参数');
    }

    const courseTypeNum = parseInt(course_type);
    if (courseTypeNum !== 1 && courseTypeNum !== 2) {
      return ResponseUtil.validationError(res, '课程类型错误');
    }

    if (courseTypeNum === 1 && !booking_id) {
      return ResponseUtil.validationError(res, '一对一课程必须提供booking_id');
    }

    if (courseTypeNum === 2 && !group_course_id) {
      return ResponseUtil.validationError(res, '团课必须提供group_course_id');
    }

    const where = { course_type: courseTypeNum };
    if (courseTypeNum === 1) {
      where.booking_id = booking_id;
    } else {
      where.group_course_id = group_course_id;
    }

    const courseContent = await CourseContent.findOne({ where });

    if (!courseContent) {
      return ResponseUtil.success(res, null, '暂无课程内容');
    }

    return ResponseUtil.success(res, courseContent);
  });
}

module.exports = CourseContentController;

