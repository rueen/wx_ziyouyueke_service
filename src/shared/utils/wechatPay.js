const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const logger = require('./logger');

/**
 * 微信支付工具类
 */
class WeChatPayUtil {
  constructor() {
    this.appId = process.env.WECHAT_APP_ID;
    this.mchId = process.env.WECHAT_MCH_ID;
    this.apiV3Key = process.env.WECHAT_API_V3_KEY;
    this.serialNo = process.env.WECHAT_SERIAL_NO;
    this.privateKeyPath = process.env.WECHAT_PRIVATE_KEY_PATH;
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL;
    
    // 加载商户私钥
    try {
      if (this.privateKeyPath && fs.existsSync(this.privateKeyPath)) {
        this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
      }
    } catch (error) {
      logger.error('加载微信支付私钥失败:', error);
    }
  }

  /**
   * 生成请求签名
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL路径
   * @param {string} timestamp - 时间戳
   * @param {string} nonceStr - 随机字符串
   * @param {string} body - 请求体
   * @returns {string} 签名
   */
  generateSignature(method, url, timestamp, nonceStr, body = '') {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * 生成Authorization头
   * @param {string} method - 请求方法
   * @param {string} url - 请求URL路径
   * @param {string} body - 请求体
   * @returns {string} Authorization头值
   */
  generateAuthorizationHeader(method, url, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const signature = this.generateSignature(method, url, timestamp, nonceStr, body);
    
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
  }

  /**
   * 生成随机字符串
   * @param {number} length - 长度
   * @returns {string} 随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * JSAPI下单
   * @param {Object} params - 下单参数
   * @param {string} params.out_trade_no - 商户订单号
   * @param {string} params.description - 商品描述
   * @param {number} params.total - 总金额(分)
   * @param {string} params.openid - 用户openid
   * @param {string} params.notify_url - 回调地址（可选，默认使用配置的）
   * @returns {Promise<Object>} 返回prepay_id等信息
   */
  async createOrder(params) {
    try {
      const url = '/v3/pay/transactions/jsapi';
      const fullUrl = `https://api.mch.weixin.qq.com${url}`;
      
      const requestData = {
        appid: this.appId,
        mchid: this.mchId,
        description: params.description,
        out_trade_no: params.out_trade_no,
        notify_url: params.notify_url || this.notifyUrl,
        amount: {
          total: params.total,
          currency: 'CNY'
        },
        payer: {
          openid: params.openid
        }
      };

      const body = JSON.stringify(requestData);
      const authorization = this.generateAuthorizationHeader('POST', url, body);

      logger.debug('微信支付下单请求:', {
        url: fullUrl,
        out_trade_no: params.out_trade_no,
        amount: params.total
      });

      const response = await axios.post(fullUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization
        }
      });

      logger.info('微信支付下单成功:', {
        out_trade_no: params.out_trade_no,
        prepay_id: response.data.prepay_id
      });

      return {
        prepay_id: response.data.prepay_id
      };
    } catch (error) {
      logger.error('微信支付下单失败:', {
        error: error.message,
        response: error.response?.data,
        out_trade_no: params.out_trade_no
      });
      throw error;
    }
  }

  /**
   * 生成小程序调起支付参数
   * @param {string} prepayId - 预支付交易会话标识
   * @returns {Object} 小程序支付参数
   */
  generatePaymentParams(prepayId) {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;
    const signType = 'RSA';
    
    // 生成签名
    const message = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    const paySign = sign.sign(this.privateKey, 'base64');

    return {
      timeStamp,
      nonceStr,
      package: packageStr,
      signType,
      paySign
    };
  }

  /**
   * 查询订单
   * @param {string} outTradeNo - 商户订单号
   * @returns {Promise<Object>} 订单信息
   */
  async queryOrder(outTradeNo) {
    try {
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${this.mchId}`;
      const fullUrl = `https://api.mch.weixin.qq.com${url}`;
      
      const authorization = this.generateAuthorizationHeader('GET', url);

      const response = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': authorization
        }
      });

      return response.data;
    } catch (error) {
      logger.error('查询订单失败:', {
        error: error.message,
        response: error.response?.data,
        out_trade_no: outTradeNo
      });
      throw error;
    }
  }

  /**
   * 关闭订单
   * @param {string} outTradeNo - 商户订单号
   * @returns {Promise<boolean>} 是否成功
   */
  async closeOrder(outTradeNo) {
    try {
      const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
      const fullUrl = `https://api.mch.weixin.qq.com${url}`;
      
      const requestData = {
        mchid: this.mchId
      };

      const body = JSON.stringify(requestData);
      const authorization = this.generateAuthorizationHeader('POST', url, body);

      await axios.post(fullUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization
        }
      });

      logger.info('关闭订单成功:', { out_trade_no: outTradeNo });
      return true;
    } catch (error) {
      logger.error('关闭订单失败:', {
        error: error.message,
        response: error.response?.data,
        out_trade_no: outTradeNo
      });
      return false;
    }
  }

  /**
   * 验证回调签名
   * @param {Object} headers - 请求头
   * @param {string} body - 请求体
   * @returns {boolean} 验证结果
   */
  verifyNotifySignature(headers, body) {
    try {
      const timestamp = headers['wechatpay-timestamp'];
      const nonce = headers['wechatpay-nonce'];
      const signature = headers['wechatpay-signature'];
      const serialNo = headers['wechatpay-serial'];

      if (!timestamp || !nonce || !signature || !serialNo) {
        logger.error('回调签名验证失败：缺少必要的头信息');
        return false;
      }

      // 注意：这里需要使用微信支付平台证书的公钥来验证
      // 实际生产环境中，需要先下载并缓存平台证书
      // 这里简化处理，实际使用时需要实现证书管理
      
      logger.info('回调签名验证（简化版本）', {
        timestamp,
        nonce,
        serialNo
      });

      // TODO: 实现完整的签名验证逻辑
      // 1. 获取微信支付平台证书
      // 2. 构建验证串
      // 3. 使用平台证书公钥验证签名

      return true;
    } catch (error) {
      logger.error('回调签名验证异常:', error);
      return false;
    }
  }

  /**
   * 解密回调数据
   * @param {Object} resource - 加密的资源数据
   * @returns {Object} 解密后的数据
   */
  decryptNotifyResource(resource) {
    try {
      if (!resource) {
        throw new Error('resource参数为空');
      }

      const { ciphertext, associated_data, nonce } = resource;
      
      if (!ciphertext || !nonce) {
        throw new Error('缺少必要的解密参数: ciphertext或nonce为空');
      }

      if (!this.apiV3Key) {
        throw new Error('APIv3密钥未配置');
      }

      // 验证APIv3密钥长度（必须是32字节）
      if (this.apiV3Key.length !== 32) {
        throw new Error(`APIv3密钥长度不正确，应为32字节，当前为${this.apiV3Key.length}字节`);
      }

      // 将APIv3密钥转换为Buffer
      const key = Buffer.from(this.apiV3Key, 'utf8');
      
      // 【重要】nonce 不需要解码，直接使用原始字符串（微信支付APIv3规范）
      const nonceStr = nonce;
      
      // 将ciphertext从base64解码
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
      
      // 在GCM模式中，认证标签（tag）固定为16字节
      // 微信支付APIv3的回调中，如果没有单独的tag字段，
      // tag包含在ciphertext的末尾（最后16字节）
      
      let tagBuffer = null;
      let actualCiphertext = ciphertextBuffer;
      
      // 如果resource中有tag字段，使用它
      if (resource.tag) {
        tagBuffer = Buffer.from(resource.tag, 'base64');
        logger.debug('使用resource.tag进行解密');
      } else {
        // 如果没有tag字段，从ciphertext末尾提取16字节作为tag
        // 这是微信支付APIv3的标准格式
        if (ciphertextBuffer.length <= 16) {
          throw new Error('ciphertext长度不足，无法提取tag');
        }
        
        // 分离ciphertext和tag
        tagBuffer = ciphertextBuffer.slice(-16); // 最后16字节是tag
        actualCiphertext = ciphertextBuffer.slice(0, -16); // 前面的部分是加密数据
        
        logger.debug('从ciphertext末尾提取tag', {
          total_length: ciphertextBuffer.length,
          ciphertext_length: actualCiphertext.length,
          tag_length: tagBuffer.length
        });
      }
      
      // 使用AEAD_AES_256_GCM解密
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        nonceStr  // 【重要】直接使用nonce字符串，不要Buffer化
      );
      
      // 先设置关联数据（必须在update之前设置）
      if (associated_data) {
        decipher.setAAD(Buffer.from(associated_data, 'utf8'));
      }
      
      // 设置认证标签（必须在update之后、final之前设置）
      decipher.setAuthTag(tagBuffer);
      
      // 解密数据（使用分离后的ciphertext，不包含tag）
      let decrypted = decipher.update(actualCiphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // 转换为字符串
      const decryptedString = decrypted.toString('utf8');
      
      // 解析JSON
      const result = JSON.parse(decryptedString);
      
      logger.info('回调数据解密成功:', {
        has_out_trade_no: !!result.out_trade_no,
        trade_state: result.trade_state,
        out_trade_no: result.out_trade_no
      });
      
      return result;
    } catch (error) {
      logger.error('解密回调数据失败:', {
        error: error.message,
        stack: error.stack,
        resource_keys: resource ? Object.keys(resource) : null,
        has_tag: !!resource?.tag,
        has_api_v3_key: !!this.apiV3Key,
        api_v3_key_length: this.apiV3Key ? this.apiV3Key.length : 0
      });
      throw error;
    }
  }
}

module.exports = new WeChatPayUtil();


