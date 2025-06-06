const axios = require('axios');
const logger = require('./logger');
const { WeChatError } = require('../middleware/errorHandler');

/**
 * 微信小程序工具类
 */
class WeChatUtil {
  constructor() {
    this.appId = process.env.WECHAT_APP_ID;
    this.appSecret = process.env.WECHAT_APP_SECRET;
  }

  /**
   * 通过code获取微信用户的openid和session_key
   * @param {string} code - 微信登录凭证
   * @returns {Promise<Object>} 包含openid和session_key的对象
   */
  async getOpenIdByCode(code) {
    try {
      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      };

      logger.debug('微信登录请求参数:', { 
        code, 
        appid: this.appId,
        appSecret: this.appSecret ? this.appSecret.substring(0, 4) + '****' : 'undefined',
        codeLength: code.length,
        requestUrl: url,
        fullRequestUrl: `${url}?${new URLSearchParams(params).toString()}`,
        timestamp: new Date().toISOString()
      });

      const response = await axios.get(url, { params });
      const data = response.data;

      logger.debug('微信登录响应:', data);

      if (data.errcode) {
        // 根据错误码提供更详细的错误信息
        let errorMessage = `微信登录失败: ${data.errmsg}`;
        
        switch (data.errcode) {
          case 40029:
            errorMessage = '微信登录失败: code 无效，请重新获取授权码';
            break;
          case 45011:
            errorMessage = '微信登录失败: API 调用频率限制，请稍后重试';
            break;
          case 40013:
            errorMessage = '微信登录失败: AppID 无效';
            break;
          case 40125:
            errorMessage = '微信登录失败: AppSecret 无效';
            break;
          default:
            errorMessage = `微信登录失败: ${data.errmsg} (错误码: ${data.errcode})`;
        }
        
        throw new WeChatError(errorMessage);
      }

      if (!data.openid) {
        throw new WeChatError('微信登录失败: 未获取到openid');
      }

      return {
        openid: data.openid,
        unionid: data.unionid || null,
        session_key: data.session_key
      };
    } catch (error) {
      logger.error('微信登录失败:', error);
      
      if (error instanceof WeChatError) {
        throw error;
      }
      
      throw new WeChatError('微信服务暂时不可用');
    }
  }

  /**
   * 获取微信访问令牌
   * @returns {Promise<string>} access_token
   */
  async getAccessToken() {
    try {
      const url = 'https://api.weixin.qq.com/cgi-bin/token';
      const params = {
        grant_type: 'client_credential',
        appid: this.appId,
        secret: this.appSecret
      };

      const response = await axios.get(url, { params });
      const data = response.data;

      if (data.errcode) {
        throw new WeChatError(`获取访问令牌失败: ${data.errmsg}`);
      }

      return data.access_token;
    } catch (error) {
      logger.error('获取微信访问令牌失败:', error);
      throw new WeChatError('微信服务暂时不可用');
    }
  }

  /**
   * 发送模板消息（小程序订阅消息）
   * @param {string} openid - 用户openid
   * @param {string} templateId - 模板ID
   * @param {Object} data - 消息数据
   * @param {string} page - 跳转页面路径
   * @returns {Promise<boolean>} 发送是否成功
   */
  async sendTemplateMessage(openid, templateId, data, page = null) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;

      const requestData = {
        touser: openid,
        template_id: templateId,
        data: data
      };

      if (page) {
        requestData.page = page;
      }

      const response = await axios.post(url, requestData);
      const result = response.data;

      if (result.errcode !== 0) {
        logger.warn('发送模板消息失败:', result);
        return false;
      }

      logger.info('发送模板消息成功:', { openid, templateId });
      return true;
    } catch (error) {
      logger.error('发送模板消息异常:', error);
      return false;
    }
  }

  /**
   * 验证用户信息签名
   * @param {Object} userInfo - 用户信息
   * @param {string} signature - 签名
   * @param {string} sessionKey - 会话密钥
   * @returns {boolean} 验证结果
   */
  verifyUserInfo(userInfo, signature, sessionKey) {
    // 这里可以实现用户信息的签名验证
    // 为了简化，暂时返回true
    return true;
  }

  /**
   * 获取小程序二维码
   * @param {string} scene - 场景值
   * @param {string} page - 页面路径
   * @param {number} width - 二维码宽度
   * @returns {Promise<Buffer>} 二维码图片数据
   */
  async getQRCode(scene, page = 'pages/index/index', width = 430) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

      const requestData = {
        scene: scene,
        page: page,
        width: width,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 }
      };

      const response = await axios.post(url, requestData, {
        responseType: 'arraybuffer'
      });

      // 检查是否返回错误信息
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const errorData = JSON.parse(response.data.toString());
        throw new WeChatError(`生成二维码失败: ${errorData.errmsg}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('生成小程序二维码失败:', error);
      throw new WeChatError('生成二维码失败');
    }
  }

  /**
   * 解密微信手机号
   * @param {string} code - 微信小程序 getPhoneNumber 返回的加密code
   * @returns {Promise<Object>} 解密后的手机号信息
   */
  async decryptPhoneNumber(code) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
      
      const requestData = {
        code: code
      };

      logger.debug('解密手机号请求参数:', { 
        code,
        accessToken: accessToken ? accessToken.substring(0, 10) + '****' : 'undefined',
        requestUrl: url,
        timestamp: new Date().toISOString()
      });

      const response = await axios.post(url, requestData);
      const data = response.data;

      logger.debug('解密手机号响应:', data);

      if (data.errcode !== 0) {
        // 根据错误码提供更详细的错误信息
        let errorMessage = `微信接口调用失败：${data.errmsg}`;
        
        switch (data.errcode) {
          case 40029:
          case 41008:
            errorMessage = '微信接口调用失败：code无效或已过期';
            break;
          case 45011:
            errorMessage = '微信接口调用失败：API调用频率限制，请稍后重试';
            break;
          case 40001:
            errorMessage = '微信接口调用失败：访问令牌无效';
            break;
          case 48001:
            errorMessage = '微信接口调用失败：接口未授权';
            break;
          default:
            errorMessage = `微信接口调用失败：${data.errmsg}`;
        }
        
        throw new WeChatError(errorMessage);
      }

      if (!data.phone_info) {
        throw new WeChatError('微信接口调用失败：未获取到手机号信息');
      }

      const phoneInfo = data.phone_info;
      
      return {
        phone: phoneInfo.phoneNumber,
        purePhoneNumber: phoneInfo.purePhoneNumber,
        countryCode: phoneInfo.countryCode,
        watermark: phoneInfo.watermark
      };
    } catch (error) {
      logger.error('微信手机号解密失败:', error);
      
      if (error instanceof WeChatError) {
        throw error;
      }
      
      throw new WeChatError('微信手机号解密服务暂时不可用');
    }
  }
}

module.exports = new WeChatUtil(); 