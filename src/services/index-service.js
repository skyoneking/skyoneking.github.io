const axios = require('axios');
const FileUtils = require('../utils/file-utils');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const { NonTradingDayError } = require('../utils/errors');
const { API_ENDPOINTS, INDEX_CODES } = require('../config/api-endpoints');

/**
 * 指数数据服务
 * 获取上证指数和深证成指的交易数据
 */
class IndexService {
  constructor() {
    this.apiTimeout = 10000;
    this.maxRetries = 3;
    this.cacheDir = 'cache/indices';
    this.dataDir = 'data/indices';
  }

  /**
   * 获取单个指数数据
   * @param {string} indexCode 指数代码 (000001.SH 或 399001.SZ)
   * @param {string} date 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object>} 指数数据
   */
  async fetchIndexData(indexCode, date = null) {
    const targetDate = date || DateUtils.getCurrentDate();

    try {
      // 验证交易日
      await DateUtils.validateTradingDay(targetDate, true, this.holidayService);

      // 获取指数配置
      const indexConfig = INDEX_CODES[indexCode];
      if (!indexConfig) {
        throw new Error(`不支持的指数代码: ${indexCode}`);
      }

      // 构建API URL
      const apiUrl = this.buildIndexApiUrl(indexCode);
      logger.info(`获取 ${indexConfig.name} 数据: ${indexCode}`);

      // 发送请求
      const response = await this.makeApiRequest(apiUrl, indexCode);

      // 调试：打印完整的API响应
      logger.info(`API响应结构: ${JSON.stringify(response.data, null, 2)}`);

      // 解析数据
      const parsedData = this.parseIndexResponse(response.data, indexCode);

      if (!parsedData) {
        logger.error(`解析失败，响应数据: ${JSON.stringify(response.data)}`);
        throw new Error(`解析 ${indexConfig.name} 数据失败`);
      }

      logger.info(`${indexConfig.name} 数据获取成功: ${JSON.stringify(parsedData)}`);
      return parsedData;

    } catch (error) {
      if (error instanceof NonTradingDayError) {
        logger.info(`${targetDate} 是非交易日，跳过指数数据获取`);
        throw error;
      }

      const errorMsg = `获取 ${indexCode} 指数数据失败: ${error.message}`;
      logger.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  /**
   * 获取所有指数数据
   * @param {string} date 日期字符串
   * @param {Object} options 配置选项
   * @returns {Promise<Object>} 所有指数数据
   */
  async fetchAllIndexData(date = null, options = {}) {
    const targetDate = date || DateUtils.getCurrentDate();
    const { useCache = true, saveToFile = true } = options;

    try {
      // 检查缓存
      if (useCache) {
        const cachedData = await this.loadFromCache(targetDate);
        if (cachedData) {
          logger.info(`从缓存加载指数数据: ${targetDate}`);
          return cachedData;
        }
      }

      // 获取所有指数数据
      const indexCodes = Object.keys(INDEX_CODES);
      const indices = [];
      const errors = [];

      for (const code of indexCodes) {
        try {
          const indexData = await this.fetchIndexData(code, targetDate);
          if (indexData) {
            indices.push(indexData);
          }
        } catch (error) {
          errors.push(`${code}: ${error.message}`);
          logger.warn(`获取 ${code} 数据失败: ${error.message}`);
        }
      }

      // 构建结果
      const result = {
        fetchDate: DateUtils.getCurrentDateTime(),
        date: targetDate,
        indices: indices,
        source: '东方财富',
        metadata: {
          tradingDay: indices.length > 0,
          fetchTime: DateUtils.getCurrentDateTime(),
          dataPoints: indices.length,
          totalRequested: indexCodes.length,
          errors: errors
        }
      };

      // 保存到文件
      if (saveToFile && indices.length > 0) {
        await this.saveIndexData(result);
      }

      // 保存到缓存
      if (useCache) {
        await this.saveToCache(result);
      }

      logger.info(`指数数据获取完成: ${indices.length}/${indexCodes.length} 个指数成功`);
      return result;

    } catch (error) {
      const errorMsg = `获取指数数据失败: ${error.message}`;
      logger.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  /**
   * 构建指数API URL
   * @param {string} indexCode 指数代码
   * @returns {string} API URL
   */
  buildIndexApiUrl(indexCode) {
    const indexConfig = INDEX_CODES[indexCode];
    if (!indexConfig) {
      throw new Error(`不支持的指数代码: ${indexCode}`);
    }

    // 根据指数代码确定市场
    const market = indexCode.endsWith('.SH') ? '1' : '0';
    const code = indexCode.replace('.SH', '').replace('.SZ', '');

    // 使用更简单的API端点，获取基本数据
    return `${API_ENDPOINTS.EASTMONEY.INDEX}?secid=${market}.${code}&fields=f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f18,f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f53,f54,f55,f56,f57,f58,f170`;
  }

  /**
   * 发送API请求
   * @param {string} url API URL
   * @param {string} indexCode 指数代码
   * @returns {Promise<Object>} 响应数据
   */
  async makeApiRequest(url, indexCode) {
    const config = {
      timeout: this.apiTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'http://quote.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*'
      }
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get(url, config);

        if (response.status === 200 && response.data) {
          return response;
        } else {
          throw new Error(`API响应异常: ${response.status}`);
        }
      } catch (error) {
        lastError = error;
        logger.warn(`API请求失败 (尝试 ${attempt}/${this.maxRetries}): ${error.message}`);

        if (attempt < this.maxRetries) {
          // 等待重试
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * 解析指数响应数据
   * @param {Object} response API响应数据
   * @param {string} indexCode 指数代码
   * @returns {Object|null} 解析后的指数数据
   */
  parseIndexResponse(response, indexCode) {
    try {
      const indexConfig = INDEX_CODES[indexCode];

      logger.info(`开始解析指数数据，响应类型: ${typeof response.data}`);

      // 东方财富API数据结构解析
      if (response.data && response.data.data) {
        const data = response.data.data;

        logger.info(`原始数据字段: ${Object.keys(data).join(', ')}`);

        // 字段映射：
        // f43: 开盘价
        // f44: 最高价
        // f45: 最低价
        // f46: 最新价/收盘价
        // f47: 成交量(手)
        // f48: 成交额(元)
        // f49: 总市值
        // f57: 代码
        // f58: 名称
        // f170: 涨跌幅
        // f4: 涨跌点数

        const last = parseFloat(data.f46 || 0);
        const change = parseFloat(data.f4 || 0);
        const chgRate = parseFloat(data.f170 || 0);
        const volume = parseInt(data.f47 || 0);
        const amount = parseFloat(data.f48 || 0) / 100000000; // 转换为亿元

        // 计算振幅和换手率
        const open = parseFloat(data.f43 || last);
        const high = parseFloat(data.f44 || last);
        const low = parseFloat(data.f45 || last);
        const amplitude = open > 0 ? ((high - low) / open * 100).toFixed(2) : 0;

        logger.info(`解析结果 - 最新价: ${last}, 涨跌幅: ${chgRate}, 成交额: ${amount}`);

        // 即使某些字段为0，也返回数据
        const result = {
          code: indexCode,
          name: data.f58 || indexConfig.name,
          market: indexConfig.market,
          open: open,
          high: high,
          low: low,
          last: last,
          prev_close: last - change,
          change: change,
          chg_rate: chgRate,
          volume: volume,
          amount: amount, // 转换为亿元
          amplitude: parseFloat(amplitude),
          turnover: 0, // 指数没有换手率概念
          pe: 0, // 指数没有市盈率
          pb: 0, // 指数没有市净率
          market_cap: parseFloat(data.f49 || 0) / 100000000, // 转换为亿元
          update_time: new Date().toISOString()
        };

        logger.info(`解析成功，返回数据: ${JSON.stringify(result, null, 2)}`);
        return result;
      }

      logger.error('响应数据结构不符合预期');
      return null;
    } catch (error) {
      logger.error(`解析指数数据失败: ${error.message}`, error);
      return null;
    }
  }

  /**
   * 保存指数数据到文件
   * @param {Object} data 指数数据
   * @returns {Promise<string[]>} 保存的文件路径
   */
  async saveIndexData(data) {
    const files = [];
    const date = data.date;

    try {
      // 确保目录存在
      await FileUtils.ensureDir(this.dataDir);

      // 保存每日综合数据
      const dailyFile = `${this.dataDir}/${date}.json`;
      await FileUtils.writeJsonFile(dailyFile, data);
      files.push(dailyFile);

      // 保存各指数的独立文件
      for (const index of data.indices) {
        const indexDir = `${this.dataDir}/${index.code.replace('.', '_').toLowerCase()}`;
        await FileUtils.ensureDir(indexDir);

        const indexFile = `${indexDir}/${date}.json`;
        await FileUtils.writeJsonFile(indexFile, {
          ...index,
          date: date,
          source: data.source,
          metadata: data.metadata
        });
        files.push(indexFile);
      }

      logger.info(`指数数据保存成功: ${files.join(', ')}`);
      return files;

    } catch (error) {
      const errorMsg = `保存指数数据失败: ${error.message}`;
      logger.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }

  /**
   * 从缓存加载数据
   * @param {string} date 日期
   * @returns {Promise<Object|null>} 缓存数据
   */
  async loadFromCache(date) {
    try {
      const cacheFile = `${this.cacheDir}/${date}.json`;

      if (await FileUtils.fileExists(cacheFile)) {
        const cachedData = await FileUtils.readJsonFile(cacheFile);

        // 检查缓存是否过期（24小时）
        const cacheTime = new Date(cachedData.fetchDate).getTime();
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时

        if (now - cacheTime < maxAge) {
          return cachedData;
        } else {
          logger.info(`缓存已过期: ${cacheFile}`);
        }
      }

      return null;
    } catch (error) {
      logger.warn(`加载缓存失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 保存数据到缓存
   * @param {Object} data 数据
   * @returns {Promise<string>} 缓存文件路径
   */
  async saveToCache(data) {
    try {
      await FileUtils.ensureDir(this.cacheDir);
      const cacheFile = `${this.cacheDir}/${data.date}.json`;
      await FileUtils.writeJsonFile(cacheFile, data);

      logger.info(`缓存保存成功: ${cacheFile}`);
      return cacheFile;
    } catch (error) {
      logger.warn(`保存缓存失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取历史指数数据
   * @param {string} indexCode 指数代码
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @returns {Promise<Object[]>} 历史数据数组
   */
  async getHistoricalData(indexCode, startDate, endDate) {
    try {
      const dates = DateUtils.getDateRange(startDate, endDate);
      const historicalData = [];

      for (const date of dates) {
        try {
          const dailyData = await this.fetchAllIndexData(date, { useCache: true, saveToFile: false });
          const indexData = dailyData.indices.find(item => item.code === indexCode);

          if (indexData) {
            historicalData.push(indexData);
          }
        } catch (error) {
          logger.warn(`获取 ${date} 的历史数据失败: ${error.message}`);
        }
      }

      return historicalData;
    } catch (error) {
      const errorMsg = `获取历史指数数据失败: ${error.message}`;
      logger.error(errorMsg, error);
      throw new Error(errorMsg);
    }
  }
}

module.exports = IndexService;