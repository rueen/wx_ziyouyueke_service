// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { Donation, sequelize } = require('../src/shared/models');
const logger = require('../src/shared/utils/logger');

/**
 * 创建赞助表的迁移脚本
 */
async function addDonationTable() {
  try {
    logger.info('开始创建赞助表...');

    // 测试数据库连接
    await sequelize.authenticate();
    logger.info('数据库连接成功');

    // 同步Donation表结构到数据库
    await Donation.sync({ alter: true });

    logger.info('赞助表创建成功！');
    
    // 打印表结构信息
    const tableInfo = await Donation.describe();
    logger.info('表结构:', tableInfo);
    
    return true;
  } catch (error) {
    logger.error('创建赞助表失败:', error);
    throw error;
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  addDonationTable()
    .then(() => {
      console.log('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}

module.exports = addDonationTable;

