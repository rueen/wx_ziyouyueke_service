const { Donation, User } = require('../../shared/models');
const wechatPayService = require('../../shared/services/wechatPayService');
const logger = require('../../shared/utils/logger');
const ResponseUtil = require('../../shared/utils/response');
const { Op } = require('sequelize');

/**
 * 赞助控制器
 */
class DonationController {
  /**
   * 创建赞助订单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async createDonation(req, res) {
    try {
      const { amount, message, is_anonymous } = req.body;
      const userId = req.user.id;
      const openid = req.user.openid;

      // 参数验证
      if (!amount || amount < 100) {
        return ResponseUtil.validationError(res, '赞助金额最低为1元');
      }

      if (amount > 50000) {
        return ResponseUtil.validationError(res, '赞助金额最高为500元');
      }

      if (message && message.length > 200) {
        return ResponseUtil.validationError(res, '留言最多200个字符');
      }

      // 创建订单并发起支付
      const result = await wechatPayService.createDonationOrder({
        user_id: userId,
        openid: openid,
        amount: amount,
        message: message,
        is_anonymous: is_anonymous || 0
      });

      logger.info('创建赞助订单成功:', {
        user_id: userId,
        donation_id: result.donation_id,
        amount: amount
      });

      return ResponseUtil.success(res, {
        donation_id: result.donation_id,
        out_trade_no: result.out_trade_no,
        prepay_id: result.prepay_id,
        timeStamp: result.timeStamp,
        nonceStr: result.nonceStr,
        package: result.package,
        signType: result.signType,
        paySign: result.paySign
      }, '订单创建成功');
    } catch (err) {
      logger.error('创建赞助订单失败:', err);
      return ResponseUtil.serverError(res, '创建订单失败，请稍后重试');
    }
  }

  /**
   * 查询赞助订单详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getDonationDetail(req, res) {
    try {
      const donationId = req.params.id;
      const userId = req.user.id;

      const donation = await Donation.findOne({
        where: {
          id: donationId,
          user_id: userId
        }
      });

      if (!donation) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      return ResponseUtil.success(res, {
        id: donation.id,
        amount: donation.amount,
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        payment_status: donation.payment_status,
        out_trade_no: donation.out_trade_no,
        transaction_id: donation.transaction_id,
        created_at: donation.createdAt,
        paid_at: donation.paid_at
      }, '查询成功');
    } catch (err) {
      logger.error('查询赞助订单失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }

  /**
   * 获取我的赞助记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getMyDonations(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.page_size) || 10;
      const offset = (page - 1) * pageSize;

      const { count, rows } = await Donation.findAndCountAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']],
        limit: pageSize,
        offset: offset
      });

      const list = rows.map(donation => ({
        id: donation.id,
        amount: donation.amount,
        message: donation.message,
        is_anonymous: donation.is_anonymous,
        payment_status: donation.payment_status,
        created_at: donation.createdAt,
        paid_at: donation.paid_at
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
      logger.error('获取我的赞助记录失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }

  /**
   * 获取赞助列表（公开，按时间排序）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getDonationList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.page_size) || 20;
      const offset = (page - 1) * pageSize;

      // 只查询已支付的订单
      const { count, rows } = await Donation.findAndCountAll({
        where: { payment_status: 1 },
        include: [{
          model: User,
          as: 'user',
          attributes: ['nickname', 'avatar_url']
        }],
        order: [['paid_at', 'DESC']],
        limit: pageSize,
        offset: offset
      });

      const list = rows.map(donation => {
        // 如果是匿名，隐藏用户信息
        const isAnonymous = donation.is_anonymous === 1;
        
        return {
          id: donation.id,
          nickname: isAnonymous ? '匿名用户' : (donation.user?.nickname || '用户'),
          avatar_url: isAnonymous ? '' : (donation.user?.avatar_url || ''),
          amount: donation.amount,
          message: donation.message,
          paid_at: donation.paid_at
        };
      });

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
   * 支付结果回调（微信支付）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async paymentNotify(req, res) {
    try {
      const headers = req.headers;
      const body = req.body;

      // 记录完整的回调信息（用于调试）
      logger.info('收到支付回调请求:', {
        method: req.method,
        url: req.url,
        headers: {
          'wechatpay-timestamp': headers['wechatpay-timestamp'],
          'wechatpay-nonce': headers['wechatpay-nonce'],
          'wechatpay-serial': headers['wechatpay-serial'],
          'wechatpay-signature': headers['wechatpay-signature'] ? '已提供' : '缺失'
        },
        body_keys: Object.keys(body || {}),
        event_type: body?.event_type,
        resource_type: body?.resource?.original_type
      });

      // 处理回调
      const success = await wechatPayService.handlePaymentNotify(headers, body);

      if (success) {
        logger.info('支付回调处理成功');
        // 返回成功响应给微信
        return res.status(200).json({
          code: 'SUCCESS',
          message: '成功'
        });
      } else {
        logger.error('支付回调处理失败');
        // 返回失败响应（微信会重试）
        return res.status(500).json({
          code: 'FAIL',
          message: '处理失败'
        });
      }
    } catch (err) {
      logger.error('处理支付回调异常:', {
        error: err.message,
        stack: err.stack,
        body: req.body
      });
      // 返回失败响应（微信会重试）
      return res.status(500).json({
        code: 'FAIL',
        message: '系统异常'
      });
    }
  }

  /**
   * 查询订单支付状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async queryPaymentStatus(req, res) {
    try {
      const donationId = req.params.id;
      const userId = req.user.id;

      const donation = await Donation.findOne({
        where: {
          id: donationId,
          user_id: userId
        }
      });

      if (!donation) {
        return ResponseUtil.notFound(res, '订单不存在');
      }

      // 如果订单已支付，直接返回
      if (donation.payment_status === 1) {
        return ResponseUtil.success(res, {
          payment_status: 1,
          paid_at: donation.paid_at
        }, '订单已支付');
      }

      // 查询微信支付订单状态
      try {
        const orderStatus = await wechatPayService.queryOrderStatus(donation.out_trade_no);
        
        // 如果微信返回已支付，更新本地订单状态
        if (orderStatus.trade_state === 'SUCCESS' && donation.payment_status !== 1) {
          await donation.markAsPaid(orderStatus.transaction_id);
        }

        return ResponseUtil.success(res, {
          payment_status: orderStatus.trade_state === 'SUCCESS' ? 1 : donation.payment_status,
          trade_state: orderStatus.trade_state,
          trade_state_desc: orderStatus.trade_state_desc
        }, '查询成功');
      } catch (queryError) {
        // 如果查询失败，返回本地状态
        logger.warn('查询微信订单状态失败，返回本地状态:', queryError);
        return ResponseUtil.success(res, {
          payment_status: donation.payment_status
        }, '查询成功');
      }
    } catch (err) {
      logger.error('查询订单支付状态失败:', err);
      return ResponseUtil.serverError(res, '查询失败');
    }
  }
}

module.exports = DonationController;

