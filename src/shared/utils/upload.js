const multer = require('multer');
const path = require('path');
const logger = require('./logger');
const { createOSSClient, getOSSFileUrl } = require('../config/oss');

/**
 * 文件上传工具类
 */
class UploadUtil {
  constructor() {
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024; // 默认2MB
  }

  /**
   * 生成唯一文件名
   * @param {string} originalName - 原始文件名
   * @param {number} userId - 用户ID
   * @returns {string} 新文件名
   */
  generateUniqueFilename(originalName, userId) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${userId}_${randomSuffix}${ext}`;
  }

  /**
   * 验证图片文件
   * @param {Object} file - multer文件对象
   * @returns {Object} 验证结果
   */
  validateImageFile(file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: '文件格式不支持，请上传图片文件'
      };
    }

    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: '文件扩展名不支持，请上传jpg、png、gif、webp格式的图片'
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `文件大小超过限制，最大支持${Math.round(this.maxFileSize / 1024 / 1024)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * 获取图片上传中间件（OSS版本）
   * @returns {Function} multer中间件
   */
  getImageUploadMiddleware() {
    // 使用内存存储，不保存到本地磁盘
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      const validation = this.validateImageFile(file);
      if (validation.valid) {
        cb(null, true);
      } else {
        cb(new Error(validation.error), false);
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 1 // 一次只能上传一个文件
      }
    }).single('file');
  }

  /**
   * 上传文件到OSS
   * @param {Object} file - multer文件对象
   * @param {number} userId - 用户ID
   * @param {string} subDir - 子目录（如images）
   * @returns {Promise<Object>} 上传结果
   */
  async uploadToOSS(file, userId, subDir = 'images') {
    try {
      const client = createOSSClient();
      
      // 生成OSS对象名称
      const filename = this.generateUniqueFilename(file.originalname, userId);
      const objectName = subDir ? `${subDir}/${filename}` : filename;
      
      // 上传到OSS（使用Bucket默认权限）
      const result = await client.put(objectName, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
          'x-oss-storage-class': 'Standard'
        }
      });

      logger.info('文件上传到OSS成功:', {
        objectName: objectName,
        size: file.size,
        mimetype: file.mimetype,
        url: result.url
      });

      return {
        success: true,
        objectName: objectName,
        filename: filename,
        url: getOSSFileUrl(objectName),
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      logger.error('文件上传到OSS失败:', {
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`OSS上传失败: ${error.message}`);
    }
  }

  /**
   * 删除OSS文件
   * @param {string} objectName - OSS对象名称或文件名
   * @param {string} subDir - 子目录（如images）
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteOSSFile(objectName, subDir = '') {
    try {
      const client = createOSSClient();
      
      // 如果传入的是文件名而不是完整对象名，需要拼接路径
      const fullObjectName = objectName.includes('/') ? objectName : (subDir ? `${subDir}/${objectName}` : objectName);
      
      await client.delete(fullObjectName);
      
      logger.info(`删除OSS文件成功: ${fullObjectName}`);
      return true;
    } catch (error) {
      logger.error(`删除OSS文件失败: ${error.message}`);
      return false;
    }
  }


}

module.exports = new UploadUtil(); 