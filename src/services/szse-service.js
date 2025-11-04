const axios = require('axios');
const { SZSE_CONFIG } = require('../config/api-endpoints');
const CacheService = require('./cache-service');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { EXCHANGES } = require('../config/constants');

/**
 * 深交所数据服务
 */
class SZSEService {
  constructor() {
    this.baseURL = SZSE_CONFIG.baseURL;
    this.timeout = SZSE_CONFIG.timeout;
    this.headers = SZSE_CONFIG.headers;
  }

  /**
   * 构建请求URL
   * @param {string} endpoint - 端点类型 (stockList, realtimeQuotes)
   * @param {Object} params - 额外参数
   * @returns {string} 完整的请求URL
   */
  buildUrl(endpoint, params = {}) {
    const endpointConfig = SZSE_CONFIG.endpoints[endpoint];
    if (!endpointConfig) {
      throw new Error(`不支持的端点: ${endpoint}`);
    }

    const finalParams = {
      ...SZSE_CONFIG.defaultParams,
      ...endpointConfig,
      ...params
    };

    const queryString = new URLSearchParams(finalParams).toString();
    return `${this.baseURL}?${queryString}`;
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @returns {Promise<Object|null>} 响应数据
   */
  async fetchData(url) {
    try {
      logger.info(`正在请求SZSE数据: ${url}`);

      const response = await axios.get(url, {
        headers: this.headers,
        timeout: this.timeout,
        responseType: 'json'
      });

      if (response.data && response.data.data) {
        logger.info(`SZSE数据获取成功，共 ${response.data.data.length} 条记录`);
        return response.data;
      } else if (response.data && response.data[0] && response.data[0].data) {
        // 处理另一种可能的响应格式
        logger.info(`SZSE数据获取成功，共 ${response.data[0].data.length} 条记录`);
        return { data: response.data[0].data };
      } else {
        logger.warn('SZSE响应数据为空或格式不正确');
        return null;
      }
    } catch (error) {
      await logger.error('请求SZSE数据失败', error);
      return null;
    }
  }

  /**
   * 标准化股票数据格式
   * @param {Array} rawData - 原始数据
   * @returns {Array} 标准化后的数据
   */
  normalizeStockData(rawData) {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map(item => {
      // 深交所数据字段映射到标准格式
      return {
        code: item.gdm || item.zqdm || '',
        name: item.zqmc || '',
        open: this.parseNumber(item.zrspj || item.jrkp),
        high: this.parseNumber(item.zgj || item.zg),
        low: this.parseNumber(item.zdj || item.zd),
        last: this.parseNumber(item.zqj || item.zj),
        prev_close: this.parseNumber(item.zrspj || item.zs),
        chg_rate: this.parseNumber(item.zdf || item.zdf),
        volume: this.parseNumber(item.cjsl || item.cjje),
        amount: this.parseNumber(item.cjje || item.cje),
        tradephase: item.jyjys || item.tradephase || '',
        change: this.parseNumber(item.zde || item.change),
        amp_rate: this.parseNumber(item.zdf || item.amp_rate),
        cpxxsubtype: item.sslb || '',
        cpxxprodusta: item.jys || '深交所'
      };
    }).filter(item => item.code && item.name);
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
   * 获取指定日期的股票数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)，默认为当前日期
   * @param {boolean} useCache - 是否使用缓存，默认true
   * @returns {Promise<Object|null>} 股票数据
   */
  async getStockData(date = null, useCache = true) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      // 检查缓存
      if (useCache) {
        const cachedData = await CacheService.getCachedData(EXCHANGES.SZSE, targetDate);
        if (cachedData) {
          return cachedData;
        }
      }

      // 构建请求URL
      const url = this.buildUrl('stockList', {
        tab: 'tab1'
      });

      // 获取数据
      const response = await this.fetchData(url);

      if (response && response.data) {
        // 标准化数据格式
        const normalizedData = this.normalizeStockData(response.data);

        // 保存到缓存
        await CacheService.saveCachedData(EXCHANGES.SZSE, targetDate, normalizedData);

        return {
          fetchDate: DateUtils.getCurrentDateTime(),
          exchange: EXCHANGES.SZSE,
          date: targetDate,
          data: normalizedData
        };
      }

      return null;
    } catch (error) {
      await logger.error(`获取SZSE股票数据失败: ${targetDate}`, error);
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

    logger.info(`开始批量获取SZSE数据: ${startDate} 到 ${endDate}`);

    for (const date of dates) {
      logger.info(`正在获取 ${date} 的数据...`);

      const data = await this.getStockData(date, useCache);
      if (data) {
        results.push(data);
      }

      // 添加延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`SZSE批量数据获取完成，共获取 ${results.length} 天的数据`);
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
    await CacheService.refreshCache(EXCHANGES.SZSE, targetDate);

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
        exchange: EXCHANGES.SZSE,
        totalCount: 0,
        tradingCount: 0,
        suspendedCount: 0
      };
    }

    const totalCount = data.data.length;
    const tradingCount = data.data.filter(item =>
      item.tradephase && (item.tradephase.includes('交易') || item.tradephase === '')
    ).length;
    const suspendedCount = totalCount - tradingCount;

    return {
      date: targetDate,
      exchange: EXCHANGES.SZSE,
      totalCount,
      tradingCount,
      suspendedCount
    };
  }

  /**
   * 获取实时行情数据
   * @returns {Promise<Object|null>} 实时行情数据
   */
  async getRealtimeQuotes() {
    try {
      const url = this.buildUrl('realtimeQuotes', {
        tab: 'tab2'
      });

      const response = await this.fetchData(url);

      if (response && response.data) {
        const normalizedData = this.normalizeStockData(response.data);
        return {
          fetchDate: DateUtils.getCurrentDateTime(),
          exchange: EXCHANGES.SZSE,
          type: 'realtime',
          data: normalizedData
        };
      }

      return null;
    } catch (error) {
      await logger.error('获取SZSE实时行情失败', error);
      return null;
    }
  }
}

module.exports = SZSEService;