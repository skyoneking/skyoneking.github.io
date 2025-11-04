const FileUtils = require('../utils/file-utils');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const path = require('path');
const moment = require('moment');
const { EXCHANGES } = require('../config/constants');

/**
 * 缓存服务 - 处理数据文件缓存
 */
class CacheService {
  /**
   * 获取缓存的数据文件
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Object|null} 缓存的数据，不存在返回null
   */
  static async getCachedData(exchange, date) {
    try {
      let filePath;

      switch (exchange.toUpperCase()) {
        case EXCHANGES.SSE:
          filePath = FileUtils.getSseDataPath(date);
          break;
        case EXCHANGES.SZSE:
          filePath = FileUtils.getSzseDataPath(date);
          break;
        default:
          throw new Error(`不支持的交易所: ${exchange}`);
      }

      if (await FileUtils.fileExists(filePath)) {
        const data = await FileUtils.readJsonFile(filePath);
        logger.info(`从缓存读取数据: ${exchange} ${date}`);
        return data;
      }

      return null;
    } catch (error) {
      await logger.error(`获取缓存数据失败: ${exchange} ${date}`, error);
      return null;
    }
  }

  /**
   * 保存数据到缓存
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {Array|Object} data - 要缓存的数据
   * @returns {boolean} 是否保存成功
   */
  static async saveCachedData(exchange, date, data) {
    try {
      const cacheData = {
        fetchDate: DateUtils.getCurrentDateTime(),
        exchange: exchange.toUpperCase(),
        date: date,
        data: data
      };

      let filePath;

      switch (exchange.toUpperCase()) {
        case EXCHANGES.SSE:
          filePath = FileUtils.getSseDataPath(date);
          break;
        case EXCHANGES.SZSE:
          filePath = FileUtils.getSzseDataPath(date);
          break;
        default:
          throw new Error(`不支持的交易所: ${exchange}`);
      }

      await FileUtils.writeJsonFile(filePath, cacheData);
      logger.info(`数据已缓存: ${exchange} ${date}`);
      return true;
    } catch (error) {
      await logger.error(`保存缓存数据失败: ${exchange} ${date}`, error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在且有效
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {number} maxAgeHours - 最大缓存有效期（小时），默认24小时
   * @returns {boolean} 缓存是否有效
   */
  static async isCacheValid(exchange, date, maxAgeHours = 24) {
    try {
      const cachedData = await this.getCachedData(exchange, date);

      if (!cachedData) {
        return false;
      }

      // 检查缓存时间
      const fetchDate = moment(cachedData.fetchDate);
      const now = moment();
      const hoursDiff = now.diff(fetchDate, 'hours');

      return hoursDiff <= maxAgeHours;
    } catch (error) {
      await logger.error(`检查缓存有效性失败: ${exchange} ${date}`, error);
      return false;
    }
  }

  /**
   * 强制刷新缓存（删除现有缓存）
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {boolean} 是否删除成功
   */
  static async refreshCache(exchange, date) {
    try {
      let filePath;

      switch (exchange.toUpperCase()) {
        case EXCHANGES.SSE:
          filePath = FileUtils.getSseDataPath(date);
          break;
        case EXCHANGES.SZSE:
          filePath = FileUtils.getSzseDataPath(date);
          break;
        default:
          throw new Error(`不支持的交易所: ${exchange}`);
      }

      await FileUtils.deleteFile(filePath);
      logger.info(`缓存已刷新: ${exchange} ${date}`);
      return true;
    } catch (error) {
      await logger.error(`刷新缓存失败: ${exchange} ${date}`, error);
      return false;
    }
  }

  /**
   * 列出指定交易所的所有缓存文件
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @returns {Array} 缓存文件信息数组
   */
  static async listCachedFiles(exchange) {
    try {
      let dirPath;

      switch (exchange.toUpperCase()) {
        case EXCHANGES.SSE:
          dirPath = path.dirname(FileUtils.getSseDataPath('2023-01-01'));
          break;
        case EXCHANGES.SZSE:
          dirPath = path.dirname(FileUtils.getSzseDataPath('2023-01-01'));
          break;
        default:
          throw new Error(`不支持的交易所: ${exchange}`);
      }

      const files = await FileUtils.listFiles(dirPath);
      const fileInfos = [];

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await FileUtils.getFileSize(filePath);
        const date = file.replace('.json', '');

        fileInfos.push({
          date,
          fileName: file,
          filePath,
          size: stats
        });
      }

      return fileInfos.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      await logger.error(`列出缓存文件失败: ${exchange}`, error);
      return [];
    }
  }

  /**
   * 清理过期的缓存文件
   * @param {string} exchange - 交易所代码 (SSE/SZSE)
   * @param {number} daysToKeep - 保留天数，默认30天
   * @returns {number} 清理的文件数量
   */
  static async cleanExpiredCache(exchange, daysToKeep = 30) {
    try {
      const files = await this.listCachedFiles(exchange);
      const cutoffDate = DateUtils.getPreviousDate(daysToKeep);
      let cleanedCount = 0;

      for (const file of files) {
        if (file.date < cutoffDate) {
          await FileUtils.deleteFile(file.filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`清理过期缓存: ${exchange} 清理了 ${cleanedCount} 个文件`);
      }

      return cleanedCount;
    } catch (error) {
      await logger.error(`清理过期缓存失败: ${exchange}`, error);
      return 0;
    }
  }
}

module.exports = CacheService;