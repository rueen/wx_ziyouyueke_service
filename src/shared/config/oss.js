/*
 * @Author: diaochan
 * @Date: 2025-06-06 20:46:57
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-06 20:52:01
 * @Description: 
 */
/**
 * @File: config/oss.js
 * @Author: diaochan
 * @Date: 2025-06-06 20:33:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-06 20:33:00
 * @Description: 阿里云OSS配置
 */

// 加载环境变量
require('dotenv').config();

const OSS = require('ali-oss');

/**
 * OSS配置
 */
const ossConfig = {
  // OSS地域
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  // 访问密钥ID
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  // 访问密钥Secret
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  // 存储桶名称
  bucket: process.env.OSS_BUCKET || 'ziyouyueke',
  // 是否启用HTTPS
  secure: true,
  // 超时时间（毫秒）
  timeout: 60000
};

// 验证必要的环境变量
if (!ossConfig.accessKeyId || !ossConfig.accessKeySecret) {
  throw new Error('OSS配置错误：请检查环境变量 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 是否设置');
}

/**
 * 创建OSS客户端实例
 * @returns {OSS} OSS客户端实例
 */
function createOSSClient() {
  return new OSS(ossConfig);
}

/**
 * 生成OSS文件URL
 * @param {string} objectName - OSS对象名称
 * @returns {string} 文件访问URL
 */
function getOSSFileUrl(objectName) {
  const client = createOSSClient();
  // 生成公开访问的URL
  return `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${objectName}`;
}

module.exports = {
  ossConfig,
  createOSSClient,
  getOSSFileUrl
}; 