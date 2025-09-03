const logger = require('../utils/logger');

/**
 * 智能数据库初始化器
 * 负责创建新表和对应的默认数据
 */
class DatabaseInitializer {
  constructor() {
    this.sequelize = require('../config/database');
  }

  /**
   * 智能数据库初始化
   * 返回值：{ isFirstDeploy: boolean, newTables: string[] }
   */
  async initialize() {
    // 获取当前数据库中的所有表
    const existingTables = await this.sequelize.getQueryInterface().showAllTables();
    
    // 判断是否为首次部署（没有任何表）
    const isFirstDeploy = existingTables.length === 0;
    const newTables = [];
    
    if (isFirstDeploy) {
      // 场景2：首次部署 - 创建所有表和所有默认数据
      logger.info('检测到首次部署，开始创建所有表和默认数据...');
      await this.sequelize.sync({ force: false, alter: false });
      logger.info('所有数据库表创建完成');
      
      // 获取所有新创建的表名
      const models = this.sequelize.models;
      for (const modelName in models) {
        newTables.push(models[modelName].tableName);
      }
      
      // 为所有新表创建默认数据
      await this.createDefaultDataForTables(newTables);
      
      return { isFirstDeploy: true, newTables };
    } else {
      // 非首次部署 - 只创建新表
      const models = this.sequelize.models;
      
      for (const modelName in models) {
        const model = models[modelName];
        const tableName = model.tableName;
        
        // 检查表是否存在
        if (!existingTables.includes(tableName)) {
          try {
            // 只为不存在的表创建表结构
            await model.sync({ force: false, alter: false });
            logger.info(`新表创建成功: ${tableName}`);
            newTables.push(tableName);
          } catch (error) {
            logger.warn(`创建表 ${tableName} 失败:`, error.message);
          }
        }
      }
      
      // 为新创建的表创建默认数据
      if (newTables.length > 0) {
        await this.createDefaultDataForTables(newTables);
      }
      
      return { isFirstDeploy: false, newTables };
    }
  }

  /**
   * 为指定的新创建表创建默认数据
   * @param {string[]} newTables - 新创建的表名数组
   */
  async createDefaultDataForTables(newTables) {
    logger.info(`开始为新创建的表创建默认数据: ${newTables.join(', ')}`);
    
    for (const tableName of newTables) {
      try {
        await this.createDefaultDataForTable(tableName);
      } catch (error) {
        logger.warn(`为表 ${tableName} 创建默认数据失败:`, error.message);
      }
    }
    
    logger.info('默认数据创建完成');
  }

  /**
   * 为单个表创建默认数据
   * @param {string} tableName - 表名
   */
  async createDefaultDataForTable(tableName) {
    switch (tableName) {
      case 'waiters':
        await this.createDefaultWaiters();
        break;
      
      case 'time_templates':
        await this.createDefaultTimeTemplates();
        break;
      
      case 'course_categories':
        await this.createDefaultCourseCategories();
        break;
      
      // 在这里添加更多表的默认数据创建逻辑
      // case 'your_table_name':
      //   await this.createDefaultYourTableData();
      //   break;
      
      default:
        logger.info(`表 ${tableName} 无需创建默认数据`);
        break;
    }
  }

  /**
   * 创建默认管理员账号
   */
  async createDefaultWaiters() {
    try {
      const Waiter = require('../models/Waiter');
      await Waiter.createDefaultAdmin();
      logger.info('默认管理员账号创建完成');
    } catch (error) {
      logger.warn('创建默认管理员账号失败:', error.message);
    }
  }

  /**
   * 创建默认时间模板
   */
  async createDefaultTimeTemplates() {
    try {
      const TimeTemplate = require('../models/TimeTemplate');
      const defaultTemplates = [
        {
          name: '默认模板',
          time_slots: JSON.stringify([
            { start: '09:00', end: '10:00' },
            { start: '10:00', end: '11:00' },
            { start: '14:00', end: '15:00' },
            { start: '15:00', end: '16:00' }
          ]),
          is_default: true,
          status: 'active'
        }
      ];

      for (const template of defaultTemplates) {
        const [timeTemplate, created] = await TimeTemplate.findOrCreate({
          where: { name: template.name },
          defaults: template
        });
        
        if (created) {
          logger.info(`默认时间模板创建成功: ${template.name}`);
        }
      }
    } catch (error) {
      logger.warn('创建默认时间模板失败:', error.message);
    }
  }

  /**
   * 创建默认课程分类
   */
  async createDefaultCourseCategories() {
    try {
      // 这里只是示例，假设有课程分类表
      logger.info('课程分类表已创建，但暂无默认数据配置');
      
      // 示例代码：
      // const CourseCategory = require('../models/CourseCategory');
      // const defaultCategories = [
      //   { name: '体能训练', description: '提升身体素质的训练课程' },
      //   { name: '技能培训', description: '专业技能提升课程' }
      // ];
      // 
      // for (const category of defaultCategories) {
      //   const [cat, created] = await CourseCategory.findOrCreate({
      //     where: { name: category.name },
      //     defaults: category
      //   });
      //   if (created) {
      //     logger.info(`默认课程分类创建成功: ${category.name}`);
      //   }
      // }
    } catch (error) {
      logger.warn('创建默认课程分类失败:', error.message);
    }
  }
}

module.exports = DatabaseInitializer;
