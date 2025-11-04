const { asyncHandler } = require('../../shared/middlewares/errorHandler');
const ResponseUtil = require('../../shared/utils/response');
const WeChatUtil = require('../../shared/utils/wechat');
const logger = require('../../shared/utils/logger');

/**
 * 小程序码控制器
 */
class QRCodeController {

  /**
   * 生成小程序码
   * POST /api/h5/qrcode/generate
   */
  static generateQRCode = asyncHandler(async (req, res) => {
    const {
      scene,
      page = 'pages/index/index',
      check_path = true,
      env_version = 'release',
      width = 430,
      auto_color = false,
      line_color = { r: 0, g: 0, b: 0 },
      is_hyaline = false
    } = req.body;

    // 参数验证
    if (!scene) {
      return ResponseUtil.validationError(res, 'scene参数不能为空');
    }

    if (typeof scene !== 'string' || scene.length > 32) {
      return ResponseUtil.validationError(res, 'scene参数必须是字符串且不超过32个字符');
    }

    // 验证scene参数格式（只支持数字、大小写英文及部分特殊字符）
    const sceneRegex = /^[a-zA-Z0-9!#$&'()*+,/:;=?@\-._~]+$/;
    if (!sceneRegex.test(scene)) {
      return ResponseUtil.validationError(res, 'scene参数格式错误，只支持数字、大小写英文及部分特殊字符：!#$&\'()*+,/:;=?@-._~');
    }

    if (width && (width < 280 || width > 1280)) {
      return ResponseUtil.validationError(res, 'width参数必须在280-1280之间');
    }

    if (env_version && !['release', 'trial', 'develop'].includes(env_version)) {
      return ResponseUtil.validationError(res, 'env_version参数必须是release、trial或develop');
    }

    try {
      // 生成小程序码
      const qrCodeBuffer = await WeChatUtil.getUnlimitedQRCode({
        scene,
        page,
        check_path,
        env_version,
        width,
        auto_color,
        line_color,
        is_hyaline
      });

      // 设置响应头
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': qrCodeBuffer.length,
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
        'Content-Disposition': `inline; filename="qrcode_${scene}.png"`
      });

      logger.info('生成小程序码成功:', { 
        scene, 
        page, 
        width,
        userId: req.user?.id,
        userAgent: req.get('User-Agent')
      });

      // 直接返回图片数据
      return res.send(qrCodeBuffer);

    } catch (error) {
      logger.error('生成小程序码失败:', error);
      return ResponseUtil.error(res, error.message || '生成小程序码失败');
    }
  });

  /**
   * 生成小程序码（返回Base64）
   * POST /api/h5/qrcode/generate-base64
   */
  static generateQRCodeBase64 = asyncHandler(async (req, res) => {
    const {
      scene,
      page = 'pages/index/index',
      check_path = true,
      env_version = 'release',
      width = 430,
      auto_color = false,
      line_color = { r: 0, g: 0, b: 0 },
      is_hyaline = false
    } = req.body;

    // 参数验证
    if (!scene) {
      return ResponseUtil.validationError(res, 'scene参数不能为空');
    }

    if (typeof scene !== 'string' || scene.length > 32) {
      return ResponseUtil.validationError(res, 'scene参数必须是字符串且不超过32个字符');
    }

    // 验证scene参数格式
    const sceneRegex = /^[a-zA-Z0-9!#$&'()*+,/:;=?@\-._~]+$/;
    if (!sceneRegex.test(scene)) {
      return ResponseUtil.validationError(res, 'scene参数格式错误，只支持数字、大小写英文及部分特殊字符：!#$&\'()*+,/:;=?@-._~');
    }

    if (width && (width < 280 || width > 1280)) {
      return ResponseUtil.validationError(res, 'width参数必须在280-1280之间');
    }

    if (env_version && !['release', 'trial', 'develop'].includes(env_version)) {
      return ResponseUtil.validationError(res, 'env_version参数必须是release、trial或develop');
    }

    try {
      // 生成小程序码
      const qrCodeBuffer = await WeChatUtil.getUnlimitedQRCode({
        scene,
        page,
        check_path,
        env_version,
        width,
        auto_color,
        line_color,
        is_hyaline
      });

      // 转换为Base64
      const base64Image = qrCodeBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;

      logger.info('生成小程序码Base64成功:', { 
        scene, 
        page, 
        width,
        size: qrCodeBuffer.length,
        userId: req.user?.id || null,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ResponseUtil.success(res, {
        qrcode: dataUrl,
        base64: base64Image,
        size: qrCodeBuffer.length,
        scene,
        page,
        width
      }, '生成小程序码成功');

    } catch (error) {
      logger.error('生成小程序码Base64失败:', error);
      return ResponseUtil.error(res, error.message || '生成小程序码失败');
    }
  });

}

module.exports = QRCodeController;
