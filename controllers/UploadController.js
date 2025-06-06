const { asyncHandler } = require('../middleware/errorHandler');
const ResponseUtil = require('../utils/response');
const uploadUtil = require('../utils/upload');
const logger = require('../utils/logger');

/**
 * 文件上传控制器
 */
class UploadController {
  /**
   * 上传图片到OSS
   * @route POST /api/upload/image
   */
  static uploadImage = asyncHandler(async (req, res) => {
    const user = req.user;
    
    // 使用multer中间件处理文件上传
    const uploadMiddleware = uploadUtil.getImageUploadMiddleware();
    
    uploadMiddleware(req, res, async (err) => {
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
      
      // 获取上传目录参数，默认为images
      const directory = req.body.directory || 'images';
      
      // 验证目录参数安全性
      const allowedDirectories = ['images', 'avatar', 'documents', 'temp'];
      if (!allowedDirectories.includes(directory)) {
        return ResponseUtil.validationError(res, '不支持的上传目录');
      }
      
      try {
        // 上传文件到OSS
        const uploadResult = await uploadUtil.uploadToOSS(req.file, user.id, directory);
        
        logger.info('图片上传到OSS成功:', {
          userId: user.id,
          directory: directory,
          objectName: uploadResult.objectName,
          filename: uploadResult.filename,
          originalName: req.file.originalname,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype,
          url: uploadResult.url,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.success(res, {
          url: uploadResult.url,
          filename: uploadResult.filename,
          objectName: uploadResult.objectName,
          directory: directory,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype
        }, '图片上传成功');
        
      } catch (error) {
        logger.error('图片上传处理失败:', {
          userId: user.id,
          directory: directory,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.serverError(res, '图片上传处理失败');
      }
    });
  });

  /**
   * 删除OSS图片
   * @route DELETE /api/upload/image/:filename
   */
  static deleteImage = asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { directory = 'images' } = req.query; // 从查询参数获取目录
    const user = req.user;
    
    if (!filename) {
      return ResponseUtil.validationError(res, '文件名不能为空');
    }
    
    // 验证目录参数安全性
    const allowedDirectories = ['images', 'avatar', 'documents', 'temp'];
    if (!allowedDirectories.includes(directory)) {
      return ResponseUtil.validationError(res, '不支持的目录参数');
    }
    
    // 简单的权限检查：文件名中包含用户ID
    if (!filename.includes(`_${user.id}_`)) {
      return ResponseUtil.businessError(res, 1003, '无权限删除此文件');
    }
    
    try {
      // 从OSS删除文件
      const deleted = await uploadUtil.deleteOSSFile(filename, directory);
      
      if (deleted) {
        logger.info('OSS图片删除成功:', {
          userId: user.id,
          filename: filename,
          directory: directory,
          objectName: `${directory}/${filename}`,
          timestamp: new Date().toISOString()
        });
        
        return ResponseUtil.success(res, null, '图片删除成功');
      } else {
        return ResponseUtil.businessError(res, 5001, '图片删除失败');
      }
      
    } catch (error) {
      logger.error('OSS图片删除失败:', {
        userId: user.id,
        filename: filename,
        directory: directory,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return ResponseUtil.serverError(res, '图片删除失败');
    }
  });


}

module.exports = UploadController; 