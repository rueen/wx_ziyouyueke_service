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
    this.maxAudioFileSize = parseInt(process.env.MAX_AUDIO_FILE_SIZE) || 20 * 1024 * 1024; // 默认20MB
    this.maxVideoFileSize = parseInt(process.env.MAX_VIDEO_FILE_SIZE) || 100 * 1024 * 1024; // 默认100MB
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
   * 验证音频文件
   * @param {Object} file - multer文件对象
   * @returns {Object} 验证结果
   */
  validateAudioFile(file) {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/m4a',
      'audio/aac',
      'audio/amr',
      'audio/x-m4a'
    ];

    const allowedExtensions = ['.mp3', '.m4a', '.aac', '.amr'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: '音频格式不支持，请上传mp3、m4a、aac、amr格式的音频文件'
      };
    }

    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: '音频文件扩展名不支持，请上传mp3、m4a、aac、amr格式的音频'
      };
    }

    if (file.size > this.maxAudioFileSize) {
      return {
        valid: false,
        error: `音频文件大小超过限制，最大支持${Math.round(this.maxAudioFileSize / 1024 / 1024)}MB`
      };
    }

    return { valid: true };
  }

  /**
   * 验证视频文件
   * @param {Object} file - multer文件对象
   * @returns {Object} 验证结果
   */
  validateVideoFile(file) {
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/avi'
    ];

    const allowedExtensions = ['.mp4', '.mov', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: '视频格式不支持，请上传mp4、mov、avi格式的视频文件'
      };
    }

    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: '视频文件扩展名不支持，请上传mp4、mov、avi格式的视频'
      };
    }

    if (file.size > this.maxVideoFileSize) {
      return {
        valid: false,
        error: `视频文件大小超过限制，最大支持${Math.round(this.maxVideoFileSize / 1024 / 1024)}MB`
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
   * 获取音频上传中间件（OSS版本）
   * @returns {Function} multer中间件
   */
  getAudioUploadMiddleware() {
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      const validation = this.validateAudioFile(file);
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
        fileSize: this.maxAudioFileSize,
        files: 1 // 一次只能上传一个文件
      }
    }).single('file');
  }

  /**
   * 获取视频上传中间件（OSS版本）
   * @returns {Function} multer中间件
   */
  getVideoUploadMiddleware() {
    const storage = multer.memoryStorage();

    const fileFilter = (req, file, cb) => {
      const validation = this.validateVideoFile(file);
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
        fileSize: this.maxVideoFileSize,
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