const { asyncHandler } = require('../middleware/errorHandler');
const ResponseUtil = require('../utils/response');
const uploadUtil = require('../utils/upload');
const logger = require('../utils/logger');

/**
 * 文件上传控制器
 */
class UploadController {
  /**
   * 上传图片
   * @route POST /api/upload/image
   */
  static uploadImage = asyncHandler(async (req, res) => {
    const user = req.user;
    
    // 使用multer中间件处理文件上传
    const uploadMiddleware = uploadUtil.getImageUploadMiddleware();
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        logger.error('图片上传失败:', { 
          userId: user.id,
          error: err.message,
          timestamp: new Date().toISOString()
        });
        
        // 处理不同类型的错误
        if (err.code === 'LIMIT_FILE_SIZE') {
          return ResponseUtil.businessError(res, 4000, '文件大小超过限制，最大支持2MB');
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          return ResponseUtil.businessError(res, 4000, '一次只能上传一个文件');
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return ResponseUtil.businessError(res, 4000, '请使用file字段上传文件');
        }
        
        return ResponseUtil.businessError(res, 4000, err.message);
      }
      
      // 检查是否有文件上传
      if (!req.file) {
        return ResponseUtil.validationError(res, '请选择要上传的图片文件');
      }
      
      try {
        // 生成文件访问URL
        const fileUrl = uploadUtil.getFileUrl(req.file.filename, 'images');
        
        logger.info('图片上传成功:', {
          userId: user.id,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url: fileUrl,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.success(res, {
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }, '图片上传成功');
        
      } catch (error) {
        logger.error('图片上传处理失败:', {
          userId: user.id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // 如果处理失败，删除已上传的文件
        if (req.file) {
          uploadUtil.deleteFile(req.file.filename, 'images');
        }
        
        return ResponseUtil.internalError(res, '图片上传处理失败');
      }
    });
  });

  /**
   * 删除图片
   * @route DELETE /api/upload/image/:filename
   */
  static deleteImage = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const user = req.user;
    
    if (!filename) {
      return ResponseUtil.validationError(res, '文件名不能为空');
    }
    
    // 检查文件是否存在
    if (!uploadUtil.fileExists(filename, 'images')) {
      return ResponseUtil.businessError(res, 1004, '文件不存在');
    }
    
    // 获取文件信息（可以用来验证文件所有权）
    const fileInfo = uploadUtil.getFileInfo(filename, 'images');
    
    // 简单的权限检查：文件名中包含用户ID
    if (!filename.includes(`_${user.id}_`)) {
      return ResponseUtil.businessError(res, 1003, '无权限删除此文件');
    }
    
    try {
      const deleted = uploadUtil.deleteFile(filename, 'images');
      
      if (deleted) {
        logger.info('图片删除成功:', {
          userId: user.id,
          filename: filename,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.success(res, null, '图片删除成功');
      } else {
        return ResponseUtil.businessError(res, 5001, '图片删除失败');
      }
      
    } catch (error) {
      logger.error('图片删除失败:', {
        userId: user.id,
        filename: filename,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return ResponseUtil.internalError(res, '图片删除失败');
    }
  });

  /**
   * 获取图片信息
   * @route GET /api/upload/image/:filename/info
   */
  static getImageInfo = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    
    if (!filename) {
      return ResponseUtil.validationError(res, '文件名不能为空');
    }
    
    // 检查文件是否存在
    if (!uploadUtil.fileExists(filename, 'images')) {
      return ResponseUtil.businessError(res, 1004, '文件不存在');
    }
    
    try {
      const fileInfo = uploadUtil.getFileInfo(filename, 'images');
      const fileUrl = uploadUtil.getFileUrl(filename, 'images');
      
      if (fileInfo) {
        return ResponseUtil.success(res, {
          ...fileInfo,
          url: fileUrl
        }, '获取图片信息成功');
      } else {
        return ResponseUtil.businessError(res, 1004, '文件信息获取失败');
      }
      
    } catch (error) {
      logger.error('获取图片信息失败:', {
        filename: filename,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return ResponseUtil.internalError(res, '获取图片信息失败');
    }
  });
}

module.exports = UploadController; 