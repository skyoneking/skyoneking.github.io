const fs = require('fs-extra');
const path = require('path');
const {
  filterNormalLimitUpStocks,
  sortLimitUpStocks,
  formatLimitUpLadder
} = require('../utils/stock-utils');
const FileUtils = require('../utils/file-utils');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { EXCHANGES } = require('../config/constants');

/**
 * 涨停板天梯分析服务
 */
class LimitUpService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'limitup');
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
   * 生成涨停板天梯
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object|null>} 涨停板天梯数据
   */
  async generateLimitUpLadder(date = null) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      logger.info(`开始生成 ${targetDate} 的涨停板天梯...`);

      // 读取股票数据
      const allStocks = await this.readStockData(targetDate);
      if (allStocks.length === 0) {
        logger.warn(`没有找到 ${targetDate} 的股票数据`);
        return null;
      }

      // 过滤涨停股票（默认排除新股和次新股）
      logger.info('正在筛选涨停股票...');
      const limitUpStocks = filterNormalLimitUpStocks(allStocks, {
        excludeNewStocks: true,
        newStockDaysThreshold: 60
      });
      logger.info(`找到涨停股票: ${limitUpStocks.length} 条`);

      if (limitUpStocks.length === 0) {
        logger.info(`当日没有涨停股票`);
        return {
          generateDate: DateUtils.getCurrentDateTime(),
          targetDate: targetDate,
          totalCount: 0,
          mainBoardCount: 0,
          growthBoardCount: 0,
          calculationMethod: 'price_based',
          stocks: []
        };
      }

      // 排序涨停股票
      logger.info('正在对涨停股票进行排序...');
      const sortedStocks = sortLimitUpStocks(limitUpStocks);

      // 格式化输出数据
      logger.info('正在格式化输出数据...');
      const ladderData = formatLimitUpLadder(sortedStocks, targetDate);

      logger.info(`涨停板天梯生成完成，共 ${ladderData.totalCount} 只股票`);
      return ladderData;

    } catch (error) {
      await logger.error(`生成涨停板天梯失败: ${targetDate}`, error);
      return null;
    }
  }

  /**
   * 保存涨停板天梯到文件
   * @param {Object} ladderData - 天梯数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<boolean}} 是否保存成功
   */
  async saveLimitUpLadder(ladderData, date) {
    try {
      await this.ensureOutputDir();

      const outputPath = path.join(this.dataDir, `${date}.json`);
      await FileUtils.writeJsonFile(outputPath, ladderData);

      logger.info(`涨停板天梯已保存到: ${outputPath}`);
      return true;

    } catch (error) {
      await logger.error(`保存涨停板天梯失败: ${date}`, error);
      return false;
    }
  }

  /**
   * 生成并保存涨停板天梯
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {boolean} saveToFile - 是否保存到文件
   * @returns {Promise<Object|null>} 涨停板天梯数据
   */
  async generateAndSave(date = null, saveToFile = true) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      // 生成天梯数据
      const ladderData = await this.generateLimitUpLadder(targetDate);
      if (!ladderData) {
        return null;
      }

      // 保存到文件
      if (saveToFile) {
        const saved = await this.saveLimitUpLadder(ladderData, targetDate);
        if (!saved) {
          logger.error('保存文件失败，但数据已生成');
        }
      }

      return ladderData;

    } catch (error) {
      await logger.error(`生成并保存涨停板天梯失败: ${targetDate}`, error);
      return null;
    }
  }

  /**
   * 读取已保存的涨停板天梯
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object|null>} 天梯数据
   */
  async readLimitUpLadder(date) {
    try {
      const filePath = path.join(this.dataDir, `${date}.json`);
      if (await FileUtils.fileExists(filePath)) {
        const data = await FileUtils.readJsonFile(filePath);
        logger.info(`读取涨停板天梯: ${filePath}`);
        return data;
      } else {
        logger.info(`没有找到 ${date} 的涨停板天梯文件`);
        return null;
      }
    } catch (error) {
      await logger.error(`读取涨停板天梯失败: ${date}`, error);
      return null;
    }
  }

  /**
   * 列出所有可用的涨停板天梯文件
   * @returns {Promise<Array>} 文件信息数组
   */
  async listLimitUpFiles() {
    try {
      await this.ensureOutputDir();
      const files = await FileUtils.listFiles(this.dataDir);

      const fileInfos = files.map(fileName => {
        const date = fileName.replace('.json', '');
        return {
          date,
          fileName,
          filePath: path.join(this.dataDir, fileName)
        };
      });

      return fileInfos.sort((a, b) => new Date(b.date) - new Date(a.date));

    } catch (error) {
      await logger.error('列出涨停板天梯文件失败', error);
      return [];
    }
  }

  /**
   * 获取涨停板天梯统计信息
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object>} 统计信息
   */
  async getLadderStatistics(date = null) {
    const targetDate = date || DateUtils.getCurrentDate();
    const ladderData = await this.generateLimitUpLadder(targetDate);

    if (!ladderData) {
      return {
        date: targetDate,
        hasData: false,
        message: '没有找到股票数据或没有涨停股票'
      };
    }

    return {
      date: targetDate,
      hasData: true,
      totalCount: ladderData.totalCount,
      mainBoardCount: ladderData.mainBoardCount,
      growthBoardCount: ladderData.growthBoardCount,
      calculationMethod: ladderData.calculationMethod,
      topStock: ladderData.stocks.length > 0 ? {
        name: ladderData.stocks[0].name,
        code: ladderData.stocks[0].code,
        changeRate: ladderData.stocks[0].actualChangeRate
      } : null
    };
  }
}

module.exports = LimitUpService;