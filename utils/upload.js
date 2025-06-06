const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * 文件上传工具类
 */
class UploadUtil {
  constructor() {
    this.uploadDir = process.env.UPLOAD_PATH || 'uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024; // 默认2MB
    
    // 确保上传目录存在
    this.ensureDirectoryExists(this.uploadDir);
    this.ensureDirectoryExists(path.join(this.uploadDir, 'images'));
  }

  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   */
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`创建上传目录: ${dirPath}`);
    }
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
   * 获取图片上传中间件
   * @returns {Function} multer中间件
   */
  getImageUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(this.uploadDir, 'images');
        this.ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const userId = req.user ? req.user.id : 'anonymous';
        const filename = this.generateUniqueFilename(file.originalname, userId);
        cb(null, filename);
      }
    });

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
   * 删除文件
   * @param {string} filename - 文件名
   * @param {string} subDir - 子目录（如images）
   * @returns {boolean} 删除是否成功
   */
  deleteFile(filename, subDir = '') {
    try {
      const filePath = path.join(this.uploadDir, subDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`删除文件成功: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`删除文件失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取文件访问URL
   * @param {string} filename - 文件名
   * @param {string} subDir - 子目录
   * @param {string} baseUrl - 基础URL
   * @returns {string} 文件访问URL
   */
  getFileUrl(filename, subDir = '', baseUrl = process.env.BASE_URL || 'http://localhost:3000') {
    if (subDir) {
      return `${baseUrl}/uploads/${subDir}/${filename}`;
    }
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * 检查文件是否存在
   * @param {string} filename - 文件名
   * @param {string} subDir - 子目录
   * @returns {boolean} 文件是否存在
   */
  fileExists(filename, subDir = '') {
    const filePath = path.join(this.uploadDir, subDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件信息
   * @param {string} filename - 文件名
   * @param {string} subDir - 子目录
   * @returns {Object|null} 文件信息
   */
  getFileInfo(filename, subDir = '') {
    try {
      const filePath = path.join(this.uploadDir, subDir, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          filename: filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      }
      return null;
    } catch (error) {
      logger.error(`获取文件信息失败: ${error.message}`);
      return null;
    }
  }
}

module.exports = new UploadUtil(); 