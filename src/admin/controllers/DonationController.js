const { Donation, User } = require('../../shared/models');
const logger = require('../../shared/utils/logger');
const ResponseUtil = require('../../shared/utils/response');
const { Op } = require('sequelize');

/**
 * 管理端赞助控制器
 */
class DonationController {
  /**
   * 获取赞助列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getDonationList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.page_size) || 20;
      const offset = (page - 1) * pageSize;
      const paymentStatus = req.query.payment_status;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      // 构建查询条件
      const where = {};
      
      if (paymentStatus !== undefined && paymentStatus !== '') {
        where.payment_status = parseInt(paymentStatus);
      }

      if (startDate && endDate) {
        where.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
        };
      } else if (startDate) {
        where.createdAt = {
          [Op.gte]: new Date(startDate)
        };
      } else if (endDate) {
        where.createdAt = {
          [Op.lte]: new Date(endDate + ' 23:59:59')
        };
      }

      const { count, rows } = await Donation.findAndCountAll({
        where: where,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'avatar_url', 'phone']
        }],
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: offset
      });

      const list = rows.map(donation => ({
        id: donation.id,
        user_id: donation.user_id,
        user_nickname: donation.user?.nickname || '未知',
        user_phone: donation.user?.phone || '',
        amount: donation.amount,
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        payment_status: donation.payment_status,
        out_trade_no: donation.out_trade_no,
        transaction_id: donation.transaction_id,
        created_at: donation.createdAt,
        paid_at: donation.paid_at,
        closed_at: donation.closed_at,
        remark: donation.remark
      }));

      const totalPages = Math.ceil(count / pageSize);

      return ResponseUtil.success(res, {
        list: list,
        total: count,
        totalPages: totalPages,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: count,
          limit: parseInt(pageSize)
        }
      }, '查询成功');
    } catch (err) {
      logger.error('获取赞助列表失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }

  /**
   * 获取赞助统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getDonationStatistics(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // 总统计（已支付）
      const totalResult = await Donation.findOne({
        where: { payment_status: 1 },
        attributes: [
          [Donation.sequelize.fn('SUM', Donation.sequelize.col('amount')), 'total_amount'],
          [Donation.sequelize.fn('COUNT', Donation.sequelize.col('id')), 'total_count']
        ],
        raw: true
      });

      // 今日统计
      const todayResult = await Donation.findOne({
        where: {
          payment_status: 1,
          paid_at: {
            [Op.gte]: today
          }
        },
        attributes: [
          [Donation.sequelize.fn('SUM', Donation.sequelize.col('amount')), 'today_amount'],
          [Donation.sequelize.fn('COUNT', Donation.sequelize.col('id')), 'today_count']
        ],
        raw: true
      });

      // 本月统计
      const monthResult = await Donation.findOne({
        where: {
          payment_status: 1,
          paid_at: {
            [Op.gte]: monthStart
          }
        },
        attributes: [
          [Donation.sequelize.fn('SUM', Donation.sequelize.col('amount')), 'month_amount'],
          [Donation.sequelize.fn('COUNT', Donation.sequelize.col('id')), 'month_count']
        ],
        raw: true
      });

      return ResponseUtil.success(res, {
        total_amount: parseInt(totalResult.total_amount) || 0,
        total_count: parseInt(totalResult.total_count) || 0,
        today_amount: parseInt(todayResult.today_amount) || 0,
        today_count: parseInt(todayResult.today_count) || 0,
        month_amount: parseInt(monthResult.month_amount) || 0,
        month_count: parseInt(monthResult.month_count) || 0
      }, '查询成功');
    } catch (err) {
      logger.error('获取赞助统计失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }

  /**
   * 获取赞助详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getDonationDetail(req, res) {
    try {
      const donationId = req.params.id;

      const donation = await Donation.findOne({
        where: { id: donationId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'avatar_url', 'phone', 'openid']
        }]
      });

      if (!donation) {
        return ResponseUtil.notFound(res, '赞助记录不存在');
      }

      return ResponseUtil.success(res, {
        id: donation.id,
        user_id: donation.user_id,
        user: {
          id: donation.user?.id,
          nickname: donation.user?.nickname,
          avatar_url: donation.user?.avatar_url,
          phone: donation.user?.phone,
          openid: donation.user?.openid
        },
        amount: donation.amount,
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        payment_status: donation.payment_status,
        out_trade_no: donation.out_trade_no,
        transaction_id: donation.transaction_id,
        prepay_id: donation.prepay_id,
        created_at: donation.createdAt,
        paid_at: donation.paid_at,
        closed_at: donation.closed_at,
        remark: donation.remark
      }, '查询成功');
    } catch (err) {
      logger.error('获取赞助详情失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }

  /**
   * 更新赞助备注
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async updateDonationRemark(req, res) {
    try {
      const donationId = req.params.id;
      const { remark } = req.body;

      const donation = await Donation.findByPk(donationId);

      if (!donation) {
        return ResponseUtil.notFound(res, '赞助记录不存在');
      }

      await donation.update({ remark: remark });

      logger.info('更新赞助备注:', {
        donation_id: donationId,
        admin_id: req.user.id
      });

      return ResponseUtil.success(res, null, '更新成功');
    } catch (err) {
      logger.error('更新赞助备注失败:', err);
      return ResponseUtil.serverError(res, '更新失败');
    }
  }
}

module.exports = DonationController;

