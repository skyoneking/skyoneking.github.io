const fs = require('fs-extra');
const path = require('path');
const {
  filterExplodedStocks,
  formatExplodedList
} = require('../utils/stock-utils');
const FileUtils = require('../utils/file-utils');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { EXCHANGES } = require('../config/constants');

/**
 * 炸板股分析服务（简化版）
 */
class LimitDownService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'limitdown');
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDir() {
    await FileUtils.ensureDir(this.dataDir);
  }

  /**
   * 读取指定日期的股票数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Array>} 合并后的股票数据数组
   */
  async readStockData(date) {
    const allStocks = [];

    try {
      // 读取上交所数据
      const sseDataPath = FileUtils.getSseDataPath(date);
      if (await FileUtils.fileExists(sseDataPath)) {
        const sseData = await FileUtils.readJsonFile(sseDataPath);
        if (sseData && sseData.data && Array.isArray(sseData.data)) {
          allStocks.push(...sseData.data.map(stock => ({
            ...stock,
            exchange: EXCHANGES.SSE
          })));
          logger.info(`读取上交所数据: ${sseData.data.length} 条记录`);
        }
      }

      // 读取深交所数据
      const szseDataPath = FileUtils.getSzseDataPath(date);
      if (await FileUtils.fileExists(szseDataPath)) {
        const szseData = await FileUtils.readJsonFile(szseDataPath);
        if (szseData && szseData.data && Array.isArray(szseData.data)) {
          allStocks.push(...szseData.data.map(stock => ({
            ...stock,
            exchange: EXCHANGES.SZSE
          })));
          logger.info(`读取深交所数据: ${szseData.data.length} 条记录`);
        }
      }

      logger.info(`总共读取股票数据: ${allStocks.length} 条记录`);
      return allStocks;

    } catch (error) {
      await logger.error(`读取股票数据失败: ${date}`, error);
      return [];
    }
  }

  /**
   * 生成炸板股列表
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object|null>} 炸板股列表数据
   */
  async generateExplodedList(date = null) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      logger.info(`开始生成 ${targetDate} 的炸板股列表...`);

      // 读取股票数据
      const allStocks = await this.readStockData(targetDate);
      if (allStocks.length === 0) {
        logger.warn(`没有找到 ${targetDate} 的股票数据`);
        return null;
      }

      // 过滤炸板股票
      logger.info('正在筛选炸板股票...');
      const explodedStocks = filterExplodedStocks(allStocks);
      logger.info(`找到炸板股票: ${explodedStocks.length} 条`);

      if (explodedStocks.length === 0) {
        logger.info(`当日没有炸板股票`);
        return {
          date: targetDate,
          generateTime: DateUtils.getCurrentDateTime(),
          totalCount: 0,
          stocks: []
        };
      }

      // 格式化输出数据
      logger.info('正在格式化输出数据...');
      const listData = formatExplodedList(explodedStocks, targetDate);

      logger.info(`炸板股列表生成完成，共 ${listData.totalCount} 只股票`);
      return listData;

    } catch (error) {
      await logger.error(`生成炸板股列表失败: ${targetDate}`, error);
      return null;
    }
  }

  /**
   * 保存炸板股列表到文件
   * @param {Object} listData - 列表数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<boolean}} 是否保存成功
   */
  async saveExplodedList(listData, date) {
    try {
      await this.ensureOutputDir();

      const outputPath = path.join(this.dataDir, `${date}.json`);
      await FileUtils.writeJsonFile(outputPath, listData);

      logger.info(`炸板股列表已保存到: ${outputPath}`);
      return true;

    } catch (error) {
      await logger.error(`保存炸板股列表失败: ${date}`, error);
      return false;
    }
  }

  /**
   * 生成并保存炸板股列表
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {boolean} saveToFile - 是否保存到文件
   * @returns {Promise<Object|null>} 炸板股列表数据
   */
  async generateAndSave(date = null, saveToFile = true) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      // 生成列表数据
      const listData = await this.generateExplodedList(targetDate);
      if (!listData) {
        return null;
      }

      // 保存到文件
      if (saveToFile) {
        const saved = await this.saveExplodedList(listData, targetDate);
        if (!saved) {
          logger.error('保存文件失败，但数据已生成');
        }
      }

      return listData;

    } catch (error) {
      await logger.error(`生成并保存炸板股列表失败: ${targetDate}`, error);
      return null;
    }
  }
}

module.exports = LimitDownService;