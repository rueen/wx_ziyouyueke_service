const wechatPayUtil = require('../utils/wechatPay');
const logger = require('../utils/logger');
const { Donation } = require('../models');

/**
 * 微信支付服务类
 */
class WeChatPayService {
  /**
   * 创建赞助订单并发起支付
   * @param {Object} params - 订单参数
   * @param {number} params.user_id - 用户ID
   * @param {string} params.openid - 用户openid
   * @param {number} params.amount - 金额(分)
   * @param {string} params.message - 留言
   * @param {number} params.is_anonymous - 是否匿名
   * @returns {Promise<Object>} 订单信息和支付参数
   */
  async createDonationOrder(params) {
    try {
      // 1. 生成商户订单号
      const outTradeNo = Donation.generateOutTradeNo();

      // 2. 创建订单记录
      const donation = await Donation.create({
        user_id: params.user_id,
        openid: params.openid,
        amount: params.amount,
        message: params.message || null,
        is_anonymous: params.is_anonymous || 0,
        out_trade_no: outTradeNo,
        payment_status: 0
      });

      logger.info('创建赞助订单:', {
        donation_id: donation.id,
        out_trade_no: outTradeNo,
        user_id: params.user_id,
        amount: params.amount
      });

      // 3. 调用微信支付统一下单接口
      const orderResult = await wechatPayUtil.createOrder({
        out_trade_no: outTradeNo,
        description: '友情赞助',
        total: params.amount,
        openid: params.openid
      });

      // 4. 更新预支付ID
      await donation.update({
        prepay_id: orderResult.prepay_id
      });

      // 5. 生成小程序调起支付参数
      const paymentParams = wechatPayUtil.generatePaymentParams(orderResult.prepay_id);

      return {
        donation_id: donation.id,
        out_trade_no: outTradeNo,
        prepay_id: orderResult.prepay_id,
        ...paymentParams
      };
    } catch (error) {
      logger.error('创建赞助订单失败:', error);
      throw error;
    }
  }

  /**
   * 处理支付回调通知
   * @param {Object} headers - 请求头
   * @param {Object} body - 请求体
   * @returns {Promise<boolean>} 处理结果
   */
  async handlePaymentNotify(headers, body) {
    try {
      // 1. 验证基本参数
      if (!body || !body.resource) {
        logger.error('支付回调数据格式错误: body或resource为空', {
          body: body,
          has_resource: !!body?.resource
        });
        return false;
      }

      // 2. 验证签名（当前为简化版本，直接通过）
      const isValid = wechatPayUtil.verifyNotifySignature(headers, JSON.stringify(body));
      if (!isValid) {
        logger.error('支付回调签名验证失败', {
          headers: {
            timestamp: headers['wechatpay-timestamp'],
            nonce: headers['wechatpay-nonce'],
            serial: headers['wechatpay-serial'],
            signature: headers['wechatpay-signature'] ? '已提供' : '缺失'
          }
        });
        return false;
      }

      // 3. 解密数据
      let decryptedData;
      try {
        decryptedData = wechatPayUtil.decryptNotifyResource(body.resource);
        logger.info('回调数据解密成功:', {
          out_trade_no: decryptedData?.out_trade_no,
          transaction_id: decryptedData?.transaction_id,
          trade_state: decryptedData?.trade_state
        });
      } catch (decryptError) {
        logger.error('回调数据解密失败:', {
          error: decryptError.message,
          stack: decryptError.stack,
          resource: body.resource
        });
        return false;
      }

      if (!decryptedData || !decryptedData.out_trade_no) {
        logger.error('解密后的数据格式错误:', decryptedData);
        return false;
      }

      // 4. 查找订单
      const donation = await Donation.findOne({
        where: { out_trade_no: decryptedData.out_trade_no }
      });

      if (!donation) {
        logger.error('未找到订单:', { 
          out_trade_no: decryptedData.out_trade_no,
          decrypted_data: decryptedData
        });
        return false;
      }

      logger.info('找到订单:', {
        donation_id: donation.id,
        out_trade_no: decryptedData.out_trade_no,
        current_status: donation.payment_status
      });

      // 5. 检查订单状态，避免重复处理
      if (donation.payment_status === 1) {
        logger.info('订单已处理，跳过:', { 
          donation_id: donation.id,
          out_trade_no: decryptedData.out_trade_no,
          transaction_id: donation.transaction_id
        });
        return true;
      }

      // 6. 根据支付状态更新订单
      if (decryptedData.trade_state === 'SUCCESS') {
        try {
          await donation.markAsPaid(decryptedData.transaction_id);
          
          logger.info('订单支付成功，状态已更新:', {
            donation_id: donation.id,
            out_trade_no: decryptedData.out_trade_no,
            transaction_id: decryptedData.transaction_id,
            amount: donation.amount
          });
          
          return true;
        } catch (updateError) {
          logger.error('更新订单状态失败:', {
            error: updateError.message,
            donation_id: donation.id,
            out_trade_no: decryptedData.out_trade_no
          });
          return false;
        }
      } else if (decryptedData.trade_state === 'CLOSED') {
        try {
          await donation.markAsClosed();
          
          logger.info('订单已关闭，状态已更新:', {
            donation_id: donation.id,
            out_trade_no: decryptedData.out_trade_no
          });
          
          return true;
        } catch (updateError) {
          logger.error('关闭订单失败:', {
            error: updateError.message,
            donation_id: donation.id
          });
          return false;
        }
      } else {
        logger.warn('未处理的支付状态:', {
          donation_id: donation.id,
          out_trade_no: decryptedData.out_trade_no,
          trade_state: decryptedData.trade_state,
          full_data: decryptedData
        });
        return false;
      }
    } catch (error) {
      logger.error('处理支付回调异常:', {
        error: error.message,
        stack: error.stack,
        headers: headers,
        body: body
      });
      return false;
    }
  }

  /**
   * 查询订单支付状态
   * @param {string} outTradeNo - 商户订单号
   * @returns {Promise<Object>} 订单状态信息
   */
  async queryOrderStatus(outTradeNo) {
    try {
      const orderInfo = await wechatPayUtil.queryOrder(outTradeNo);
      
      return {
        out_trade_no: orderInfo.out_trade_no,
        transaction_id: orderInfo.transaction_id,
        trade_state: orderInfo.trade_state,
        trade_state_desc: orderInfo.trade_state_desc,
        success_time: orderInfo.success_time
      };
    } catch (error) {
      logger.error('查询订单状态失败:', error);
      throw error;
    }
  }

  /**
   * 关闭订单
   * @param {number} donationId - 赞助ID
   * @returns {Promise<boolean>} 是否成功
   */
  async closeDonationOrder(donationId) {
    try {
      const donation = await Donation.findByPk(donationId);
      
      if (!donation) {
        logger.error('订单不存在:', { donation_id: donationId });
        return false;
      }

      if (donation.payment_status !== 0) {
        logger.warn('订单状态不允许关闭:', { 
          donation_id: donationId,
          payment_status: donation.payment_status 
        });
        return false;
      }

      // 调用微信支付关闭订单接口
      const closed = await wechatPayUtil.closeOrder(donation.out_trade_no);
      
      if (closed) {
        await donation.markAsClosed();
        logger.info('订单已关闭:', { donation_id: donationId });
      }
      
      return closed;
    } catch (error) {
      logger.error('关闭订单失败:', error);
      return false;
    }
  }

  /**
   * 自动关闭超时订单
   * 订单创建后2小时未支付自动关闭
   * @returns {Promise<number>} 关闭的订单数量
   */
  async autoCloseExpiredOrders() {
    try {
      const { Op } = require('sequelize');
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // 查找超时未支付的订单
      const expiredDonations = await Donation.findAll({
        where: {
          payment_status: 0,
          createdAt: {
            [Op.lt]: twoHoursAgo
          }
        }
      });

      let closedCount = 0;
      for (const donation of expiredDonations) {
        const closed = await this.closeDonationOrder(donation.id);
        if (closed) {
          closedCount++;
        }
      }

      logger.info('自动关闭超时订单完成:', { 
        total: expiredDonations.length,
        closed: closedCount 
      });

      return closedCount;
    } catch (error) {
      logger.error('自动关闭超时订单失败:', error);
      return 0;
    }
  }
}

module.exports = new WeChatPayService();

