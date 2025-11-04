const axios = require('axios');
const CacheService = require('./cache-service');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { EXCHANGES } = require('../config/constants');
const { NonTradingDayError } = require('../utils/errors');

/**
 * 东方财富数据服务 - 作为深交所数据的替代方案
 */
class EastMoneyService {
  constructor() {
    this.timeout = 10000;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'http://quote.eastmoney.com/',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    };
  }

  /**
   * 构建深交所股票数据的API URL
   * @param {number} page - 页码，默认1
   * @param {number} pageSize - 每页数量，默认500
   * @returns {string} API URL
   */
  buildSZSEUrl(page = 1, pageSize = 500) {
    // 东方财富深交所股票数据API
    // fs参数过滤深交所股票：m:0+t:80,m:1+t:2,m:1+t:23
    // m:0 深交所主板, m:1+t:2 中小板, m:1+t:23 创业板
    const baseUrl = 'http://push2.eastmoney.com/api/qt/clist/get';
    const params = {
      pn: page,
      pz: pageSize,
      po: 1,
      np: 1,
      ut: 'bd1d9ddb04089700cf9c27f6f7426281',
      fltt: 2,
      invt: 2,
      fid: 'f3', // 按涨跌幅排序
      fs: 'm:0+t:80,m:1+t:2,m:1+t:23', // 深交所股票过滤
      fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f33,f11,f62,f128,f136,f115,f152'
    };

    const queryString = new URLSearchParams(params).toString();
    return `${baseUrl}?${queryString}`;
  }

  /**
   * 标准化东方财富股票数据格式
   * @param {Array} rawData - 原始数据数组
   * @returns {Array} 标准化后的数据
   */
  normalizeStockData(rawData) {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map(item => {
      return {
        code: item.f12 || '',
        name: item.f14 || '',
        open: this.parseNumber(item.f17),
        high: this.parseNumber(item.f15),
        low: this.parseNumber(item.f16),
        last: this.parseNumber(item.f2),
        prev_close: this.parseNumber(item.f18),
        chg_rate: this.parseNumber(item.f3),
        volume: this.parseNumber(item.f5),
        amount: this.parseNumber(item.f6),
        tradephase: this.getTradePhase(item),
        change: this.parseNumber(item.f4),
        amp_rate: this.parseNumber(item.f7),
        cpxxsubtype: this.getStockType(item.f12),
        cpxxprodusta: '深交所'
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
   * 根据股票代码判断交易状态
   * @param {Object} item - 股票数据项
   * @returns {string} 交易阶段
   */
  getTradePhase(item) {
    // 根据f1字段判断：1-正常交易，2-停牌
    if (item.f1 === 2) {
      return '停牌';
    }

    // 根据涨跌幅度判断是否在交易时间
    if (item.f3 !== undefined && item.f3 !== null) {
      return '交易中';
    }

    return '未知';
  }

  /**
   * 根据股票代码获取股票类型
   * @param {string} code - 股票代码
   * @returns {string} 股票类型
   */
  getStockType(code) {
    if (!code) return '';

    if (code.startsWith('000')) {
      return '主板';
    } else if (code.startsWith('001')) {
      return '主板';
    } else if (code.startsWith('002')) {
      return '中小板';
    } else if (code.startsWith('300')) {
      return '创业板';
    } else if (code.startsWith('30')) {
      return '创业板';
    }

    return '其他';
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @returns {Promise<Object|null>} 响应数据
   */
  async fetchData(url) {
    try {
      logger.info(`正在请求东方财富数据: ${url}`);

      const response = await axios.get(url, {
        headers: this.headers,
        timeout: this.timeout,
        responseType: 'json'
      });

      if (response.data && response.data.data && response.data.data.diff) {
        const stockCount = response.data.data.diff.length;
        logger.info(`东方财富数据获取成功，共 ${stockCount} 条记录`);

        return {
          success: true,
          data: response.data.data.diff,
          total: response.data.data.total || stockCount
        };
      } else {
        logger.warn('东方财富响应数据为空或格式不正确');
        return null;
      }
    } catch (error) {
      await logger.error('请求东方财富数据失败', error);
      return null;
    }
  }

  /**
   * 获取指定日期的深交所股票数据（通过东方财富API）
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
            logger.info(`${targetDate} 是非交易日 (${error.reason})，跳过深交所数据获取`);
            throw error;
          } else {
            // 如果交易日检查失败，记录警告但继续获取数据
            logger.warn(`交易日检查失败: ${error.message}，将继续尝试获取数据`);
          }
        }
      }

      // 检查缓存
      if (useCache) {
        const cachedData = await CacheService.getCachedData(EXCHANGES.SZSE, targetDate);
        if (cachedData) {
          logger.info(`从缓存读取数据: SZSE ${targetDate}`);
          return cachedData;
        }
      }

      // 构建请求URL - 获取更多深交所股票
      const url = this.buildSZSEUrl(1, 2000);

      // 获取数据
      const response = await this.fetchData(url);

      if (response && response.success) {
        // 标准化数据格式
        const normalizedData = this.normalizeStockData(response.data);

        // 保存到缓存
        await CacheService.saveCachedData(EXCHANGES.SZSE, targetDate, normalizedData);
        logger.info(`数据已缓存: SZSE ${targetDate}`);

        return {
          fetchDate: DateUtils.getCurrentDateTime(),
          exchange: EXCHANGES.SZSE,
          date: targetDate,
          data: normalizedData,
          source: '东方财富'
        };
      }

      return null;
    } catch (error) {
      if (error instanceof NonTradingDayError) {
        // 重新抛出非交易日错误
        throw error;
      }
      await logger.error(`获取深交所股票数据失败: ${targetDate}`, error);
      return null;
    }
  }

  /**
   * 获取当前深交所股票数据
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Object|null>} 当前股票数据
   */
  async getCurrentStockData(useCache = true) {
    return await this.getStockData(null, useCache);
  }

  /**
   * 获取历史深交所股票数据
   * @param {string} date - 指定日期 (YYYY-MM-DD)
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Object|null>} 历史股票数据
   */
  async getHistoricalStockData(date, useCache = true) {
    if (!DateUtils.isValidDate(date)) {
      logger.error(`无效的日期格式: ${date}`);
      return null;
    }

    // 东方财富API主要提供实时数据，历史数据可能需要不同的端点
    // 这里先尝试使用相同的方法
    return await this.getStockData(date, useCache);
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
        suspendedCount: 0,
        source: '东方财富'
      };
    }

    const totalCount = data.data.length;
    const tradingCount = data.data.filter(item =>
      item.tradephase && item.tradephase.includes('交易')
    ).length;
    const suspendedCount = totalCount - tradingCount;

    return {
      date: targetDate,
      exchange: EXCHANGES.SZSE,
      totalCount,
      tradingCount,
      suspendedCount,
      source: '东方财富'
    };
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
}

module.exports = EastMoneyService;