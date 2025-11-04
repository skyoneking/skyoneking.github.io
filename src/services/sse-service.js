const axios = require('axios');
const { SSE_CONFIG } = require('../config/api-endpoints');
const CacheService = require('./cache-service');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { EXCHANGES } = require('../config/constants');
const { NonTradingDayError } = require('../utils/errors');

/**
 * 上交所数据服务
 */
class SSEService {
  constructor() {
    this.baseURL = SSE_CONFIG.baseURL;
    this.timeout = SSE_CONFIG.timeout;
    this.headers = SSE_CONFIG.headers;
  }

  /**
   * 构建请求URL
   * @param {Object} params - 请求参数
   * @returns {string} 完整的请求URL
   */
  buildUrl(params = {}) {
    const finalParams = { ...SSE_CONFIG.defaultParams, ...params };
    const queryString = new URLSearchParams(finalParams).toString();
    return `${this.baseURL}?${queryString}`;
  }

  /**
   * 解析JSONP响应
   * @param {string} jsonpResponse - JSONP响应字符串
   * @returns {Object|null} 解析后的数据
   */
  parseJSONPResponse(jsonpResponse) {
    try {
      // 提取JSON部分
      const jsonStart = jsonpResponse.indexOf('(');
      const jsonEnd = jsonpResponse.lastIndexOf(')');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('无效的JSONP响应格式');
      }

      const jsonString = jsonpResponse.substring(jsonStart + 1, jsonEnd);
      return JSON.parse(jsonString);
    } catch (error) {
      logger.error('解析JSONP响应失败', error);
      return null;
    }
  }

  /**
   * 标准化SSE股票数据格式
   * @param {Array} rawData - 原始数据数组
   * @returns {Array} 标准化后的数据
   */
  normalizeStockData(rawData) {
    if (!Array.isArray(rawData)) {
      return [];
    }

    // SSE数据字段映射: [code, name, open, high, low, last, prev_close, chg_rate, volume, amount, tradephase, change, amp_rate, cpxxsubtype, cpxxprodusta]
    return rawData.map(item => {
      if (!Array.isArray(item) || item.length < 15) {
        return null;
      }

      return {
        code: item[0] || '',
        name: item[1] || '',
        open: this.parseNumber(item[2]),
        high: this.parseNumber(item[3]),
        low: this.parseNumber(item[4]),
        last: this.parseNumber(item[5]),
        prev_close: this.parseNumber(item[6]),
        chg_rate: this.parseNumber(item[7]),
        volume: this.parseNumber(item[8]),
        amount: this.parseNumber(item[9]),
        tradephase: (item[10] || '').trim(),
        change: this.parseNumber(item[11]),
        amp_rate: this.parseNumber(item[12]),
        cpxxsubtype: item[13] || '',
        cpxxprodusta: (item[14] || '').trim()
      };
    }).filter(item => item && item.code && item.name);
  }

  /**
   * 解析数字字符串
   * @param {string|number} value - 要解析的值
   * @returns {number} 解析后的数字
   */
  parseNumber(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '').replace(/%/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @returns {Promise<Object|null>} 响应数据
   */
  async fetchData(url) {
    try {
      logger.info(`正在请求SSE数据: ${url}`);

      const response = await axios.get(url, {
        headers: this.headers,
        timeout: this.timeout,
        responseType: 'text'
      });

      // 解析JSONP响应
      const data = this.parseJSONPResponse(response.data);

      if (data && data.list) {
        logger.info(`SSE数据获取成功，共 ${data.list.length} 条记录`);
        return data;
      } else {
        logger.warn('SSE响应数据为空或格式不正确');
        return null;
      }
    } catch (error) {
      await logger.error('请求SSE数据失败', error);
      return null;
    }
  }

  /**
   * 获取指定日期的股票数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)，默认为当前日期
   * @param {boolean} useCache - 是否使用缓存，默认true
   * @param {boolean} checkTradingDay - 是否检查交易日，默认true
   * @returns {Promise<Object|null>} 股票数据
   */
  async getStockData(date = null, useCache = true, checkTradingDay = true) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      // 检查是否为交易日
      if (checkTradingDay) {
        try {
          await DateUtils.validateTradingDay(targetDate, true);
        } catch (error) {
          if (error instanceof NonTradingDayError) {
            logger.info(`${targetDate} 是非交易日 (${error.reason})，跳过SSE数据获取`);
            throw error;
          } else {
            // 如果交易日检查失败，记录警告但继续获取数据
            logger.warn(`交易日检查失败: ${error.message}，将继续尝试获取数据`);
          }
        }
      }

      // 检查缓存
      if (useCache) {
        const cachedData = await CacheService.getCachedData(EXCHANGES.SSE, targetDate);
        if (cachedData) {
          logger.info(`从缓存读取数据: SSE ${targetDate}`);
          return cachedData;
        }
      }

      // 构建请求URL
      const timestamp = Date.now();
      const params = {
        _: timestamp
      };

      const url = this.buildUrl(params);

      // 获取数据
      const response = await this.fetchData(url);

      if (response && response.list) {
        // 标准化数据格式
        const normalizedData = this.normalizeStockData(response.list);

        // 保存到缓存
        await CacheService.saveCachedData(EXCHANGES.SSE, targetDate, normalizedData);
        logger.info(`数据已缓存: SSE ${targetDate}`);

        return {
          fetchDate: DateUtils.getCurrentDateTime(),
          exchange: EXCHANGES.SSE,
          date: targetDate,
          data: normalizedData
        };
      }

      return null;
    } catch (error) {
      if (error instanceof NonTradingDayError) {
        // 重新抛出非交易日错误
        throw error;
      }
      await logger.error(`获取SSE股票数据失败: ${targetDate}`, error);
      return null;
    }
  }

  /**
   * 获取当前股票数据
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Object|null>} 当前股票数据
   */
  async getCurrentStockData(useCache = true) {
    return await this.getStockData(null, useCache);
  }

  /**
   * 获取历史股票数据
   * @param {string} date - 指定日期 (YYYY-MM-DD)
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Object|null>} 历史股票数据
   */
  async getHistoricalStockData(date, useCache = true) {
    if (!DateUtils.isValidDate(date)) {
      logger.error(`无效的日期格式: ${date}`);
      return null;
    }

    return await this.getStockData(date, useCache);
  }

  /**
   * 批量获取日期范围的股票数据
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>} 股票数据数组
   */
  async getStockDataRange(startDate, endDate, useCache = true) {
    if (!DateUtils.isValidDate(startDate) || !DateUtils.isValidDate(endDate)) {
      logger.error('无效的日期格式');
      return [];
    }

    const dates = DateUtils.getDateRange(startDate, endDate);
    const results = [];

    logger.info(`开始批量获取SSE数据: ${startDate} 到 ${endDate}`);

    for (const date of dates) {
      logger.info(`正在获取 ${date} 的数据...`);

      const data = await this.getStockData(date, useCache);
      if (data) {
        results.push(data);
      }

      // 添加延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`SSE批量数据获取完成，共获取 ${results.length} 天的数据`);
    return results;
  }

  /**
   * 强制刷新指定日期的数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object|null>} 新的股票数据
   */
  async refreshStockData(date = null) {
    const targetDate = date || DateUtils.getCurrentDate();

    // 删除缓存
    await CacheService.refreshCache(EXCHANGES.SSE, targetDate);

    // 重新获取数据
    return await this.getStockData(targetDate, false);
  }

  /**
   * 搜索特定股票代码的数据
   * @param {string} stockCode - 股票代码
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object|null>} 特定股票的数据
   */
  async getStockByCode(stockCode, date = null) {
    const targetDate = date || DateUtils.getCurrentDate();
    const allData = await this.getStockData(targetDate);

    if (allData && allData.data) {
      const stock = allData.data.find(item => item.code === stockCode);
      return stock || null;
    }

    return null;
  }

  /**
   * 获取数据统计信息
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object>} 统计信息
   */
  async getDataStatistics(date = null) {
    const targetDate = date || DateUtils.getCurrentDate();
    const data = await this.getStockData(targetDate);

    if (!data || !data.data) {
      return {
        date: targetDate,
        exchange: EXCHANGES.SSE,
        totalCount: 0,
        tradingCount: 0,
        suspendedCount: 0
      };
    }

    const totalCount = data.data.length;
    const tradingCount = data.data.filter(item =>
      item.tradephase && item.tradephase.includes('交易')
    ).length;
    const suspendedCount = totalCount - tradingCount;

    return {
      date: targetDate,
      exchange: EXCHANGES.SSE,
      totalCount,
      tradingCount,
      suspendedCount
    };
  }
}

module.exports = SSEService;