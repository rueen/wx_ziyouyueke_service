const { Address } = require('../../models');
const { asyncHandler } = require('../../middleware/errorHandler');
const ResponseUtil = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * 地址管理控制器
 */
class AddressController {
  /**
   * 获取地址列表
   * @route GET /api/h5/addresses
   */
  static getAddressList = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: addresses } = await Address.findAndCountAll({
      where: { user_id: userId },
      order: [
        ['is_default', 'DESC'], // 默认地址优先
        ['createdAt', 'DESC']   // 最新创建的在前
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    return ResponseUtil.success(res, {
      list: addresses,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_count: count,
        limit: parseInt(limit)
      }
    }, '获取地址列表成功');
  });

  /**
   * 创建地址
   * @route POST /api/h5/addresses
   */
  static createAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, address, latitude, longitude, is_default = false } = req.body;

    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default) {
      await Address.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
    }

    const newAddress = await Address.create({
      user_id: userId,
      name,
      address,
      latitude,
      longitude,
      is_default
    });

    logger.info('用户创建地址:', { userId, addressId: newAddress.id, name });

    return ResponseUtil.success(res, newAddress, '地址添加成功');
  });

  /**
   * 更新地址
   * @route PUT /api/h5/addresses/:id
   */
  static updateAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, address, latitude, longitude, is_default } = req.body;

    const addressRecord = await Address.findOne({
      where: { id, user_id: userId }
    });

    if (!addressRecord) {
      return ResponseUtil.notFound(res, '地址不存在或无权限修改');
    }

    // 准备更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (is_default !== undefined) updateData.is_default = is_default;

    // 如果设置为默认地址，先将其他地址设为非默认
    if (is_default === true) {
      await Address.update(
        { is_default: false },
        { where: { user_id: userId, id: { [require('sequelize').Op.ne]: id } } }
      );
    }

    await addressRecord.update(updateData);
    logger.info('用户更新地址:', { userId, addressId: id, updateData });

    return ResponseUtil.success(res, addressRecord, '地址更新成功');
  });

  /**
   * 删除地址
   * @route DELETE /api/h5/addresses/:id
   */
  static deleteAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const addressRecord = await Address.findOne({
      where: { id, user_id: userId }
    });

    if (!addressRecord) {
      return ResponseUtil.notFound(res, '地址不存在或无权限删除');
    }

    await addressRecord.destroy();
    logger.info('用户删除地址:', { userId, addressId: id });

    return ResponseUtil.success(res, null, '地址删除成功');
  });

  /**
   * 设置默认地址
   * @route PUT /api/h5/addresses/:id/default
   */
  static setDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const addressRecord = await Address.findOne({
      where: { id, user_id: userId }
    });

    if (!addressRecord) {
      return ResponseUtil.notFound(res, '地址不存在或无权限操作');
    }

    // 使用模型方法设置默认地址
    await addressRecord.setAsDefault();
    logger.info('用户设置默认地址:', { userId, addressId: id });

    return ResponseUtil.success(res, {
      id: addressRecord.id,
      is_default: true
    }, '默认地址设置成功');
  });

  /**
   * 获取默认地址
   * @route GET /api/h5/addresses/default
   */
  static getDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const defaultAddress = await Address.findOne({
      where: { 
        user_id: userId,
        is_default: true 
      }
    });

    if (!defaultAddress) {
      return ResponseUtil.notFound(res, '未设置默认地址');
    }

    return ResponseUtil.success(res, defaultAddress, '获取默认地址成功');
  });
}

module.exports = AddressController; 