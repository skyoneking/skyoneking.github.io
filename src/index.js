const SSEService = require('./services/sse-service');
const SZSEService = require('./services/szse-service');
const EastMoneyService = require('./services/eastmoney-service');
const LimitUpService = require('./services/limitup-service');
const LimitDownService = require('./services/limitdown-service');
const CacheService = require('./services/cache-service');
const HolidayService = require('./services/holiday-service');
const FileUtils = require('./utils/file-utils');
const DateUtils = require('./utils/date-utils');
const logger = require('./utils/logger');
const { EXCHANGES } = require('./config/constants');
const { NonTradingDayError } = require('./utils/errors');

/**
 * 股票数据生成器
 * 提供统一的数据获取和分析接口
 */
class StockDataGenerator {
  constructor() {
    // 创建服务实例
    this.sseService = new SSEService();
    this.szseService = new SZSEService();
    this.eastMoneyService = new EastMoneyService();
    this.limitUpService = new LimitUpService();
    this.limitDownService = new LimitDownService();
    this.cacheService = new CacheService();
    this.holidayService = new HolidayService();
  }

  /**
   * 初始化目录
   */
  async initializeDirectories() {
    await FileUtils.initDirectories();
  }

  /**
   * 获取当日股票数据
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 数据结果
   */
  async fetchCurrentData(options = {}) {
    try {
      await this.initializeDirectories();

      const results = {};
      const errors = [];

      // 获取上交所数据
      if (!options.exchange || options.exchange.toLowerCase() === EXCHANGES.SSE.toLowerCase()) {
        try {
          results.sse = await this.sseService.getCurrentStockData(!options.noCache);
          if (results.sse) {
            logger.info(`上交所数据获取成功，共 ${results.sse.data.length} 条记录`);
          }
        } catch (error) {
          const errorMsg = `上交所数据获取失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      // 获取深交所数据
      if (!options.exchange || options.exchange.toLowerCase() === EXCHANGES.SZSE.toLowerCase()) {
        try {
          results.szse = await this.eastMoneyService.getCurrentStockData(!options.noCache);
          if (results.szse) {
            logger.info(`深交所数据获取成功，共 ${results.szse.data.length} 条记录`);
          }
        } catch (error) {
          const errorMsg = `深交所数据获取失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors,
        metadata: {
          date: DateUtils.getCurrentDate(),
          fetchedAt: DateUtils.getCurrentDateTime(),
          sources: Object.keys(results)
        }
      };

    } catch (error) {
      await logger.error('获取当日数据失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 获取指定日期的股票数据
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 数据结果
   */
  async fetchDateData(date, options = {}) {
    try {
      if (!DateUtils.isValidDate(date)) {
        return {
          success: false,
          data: null,
          errors: ['无效的日期格式，请使用 YYYY-MM-DD 格式'],
          metadata: null
        };
      }

      // 检查是否为交易日
      const checkTradingDay = options.checkTradingDay !== false; // 默认启用交易日检查
      let tradingDayStatus = null;

      if (checkTradingDay) {
        try {
          tradingDayStatus = await DateUtils.validateTradingDay(date, true, this.holidayService);
          logger.info(`${date} 是交易日，将继续获取数据`);
        } catch (error) {
          if (error instanceof NonTradingDayError) {
            return {
              success: false,
              data: null,
              errors: [error.message],
              metadata: {
                date: date,
                fetchedAt: DateUtils.getCurrentDateTime(),
                tradingDayStatus: {
                  isTradingDay: false,
                  reason: error.reason,
                  suggestion: error.suggestion
                }
              }
            };
          } else {
            logger.warn(`交易日检查失败: ${error.message}，将继续尝试获取数据`);
          }
        }
      }

      await this.initializeDirectories();

      const results = {};
      const errors = [];

      // 获取上交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SSE) {
        try {
          results.sse = await this.sseService.getStockData(date, !options.noCache, checkTradingDay);
          if (results.sse) {
            logger.info(`上交所 ${date} 数据获取成功，共 ${results.sse.data.length} 条记录`);
          }
        } catch (error) {
          if (error instanceof NonTradingDayError) {
            const errorMsg = `上交所 ${date} 跳过: ${error.reason}`;
            logger.info(errorMsg);
          } else {
            const errorMsg = `上交所 ${date} 数据获取失败: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
          }
        }
      }

      // 获取深交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SZSE) {
        try {
          results.szse = await this.eastMoneyService.getStockData(date, !options.noCache, checkTradingDay);
          if (results.szse) {
            logger.info(`深交所 ${date} 数据获取成功，共 ${results.szse.data.length} 条记录`);
          }
        } catch (error) {
          if (error instanceof NonTradingDayError) {
            const errorMsg = `深交所 ${date} 跳过: ${error.reason}`;
            logger.info(errorMsg);
          } else {
            const errorMsg = `深交所 ${date} 数据获取失败: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
          }
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors,
        metadata: {
          date: date,
          fetchedAt: DateUtils.getCurrentDateTime(),
          sources: Object.keys(results),
          tradingDayStatus: tradingDayStatus
        }
      };

    } catch (error) {
      await logger.error(`获取 ${date} 数据失败`, error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 批量获取日期范围的数据
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 数据结果
   */
  async fetchRangeData(startDate, endDate, options = {}) {
    try {
      if (!DateUtils.isValidDate(startDate) || !DateUtils.isValidDate(endDate)) {
        return {
          success: false,
          data: null,
          errors: ['无效的日期格式，请使用 YYYY-MM-DD 格式'],
          metadata: null
        };
      }

      await this.initializeDirectories();

      const results = {};
      const errors = [];

      // 获取上交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SSE) {
        try {
          results.sse = await this.sseService.getStockDataRange(startDate, endDate, !options.noCache);
          logger.info(`上交所批量数据获取完成，共 ${results.sse.length} 天的数据`);
        } catch (error) {
          const errorMsg = `上交所批量数据获取失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      // 获取深交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SZSE) {
        try {
          results.szse = await this.eastMoneyService.getStockDataRange(startDate, endDate, !options.noCache);
          logger.info(`深交所批量数据获取完成，共 ${results.szse.length} 天的数据`);
        } catch (error) {
          const errorMsg = `深交所批量数据获取失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors,
        metadata: {
          dateRange: { startDate, endDate },
          fetchedAt: DateUtils.getCurrentDateTime(),
          sources: Object.keys(results)
        }
      };

    } catch (error) {
      await logger.error('批量获取数据失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 生成涨停板天梯
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 天梯数据结果
   */
  async generateLimitUpLadder(date, options = {}) {
    try {
      await this.initializeDirectories();

      const targetDate = date || DateUtils.getCurrentDate();
      const ladderData = await this.limitUpService.generateAndSave(targetDate, !options.noSave);

      if (ladderData) {
        return {
          success: true,
          data: ladderData,
          errors: [],
          metadata: {
            date: targetDate,
            generatedAt: DateUtils.getCurrentDateTime(),
            type: 'limitUp'
          }
        };
      } else {
        return {
          success: false,
          data: null,
          errors: ['涨停板天梯生成失败'],
          metadata: {
            date: targetDate,
            generatedAt: DateUtils.getCurrentDateTime(),
            type: 'limitUp'
          }
        };
      }

    } catch (error) {
      await logger.error('生成涨停板天梯失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 生成炸板股列表
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 列表数据结果
   */
  async generateExplodedList(date, options = {}) {
    try {
      await this.initializeDirectories();

      const targetDate = date || DateUtils.getCurrentDate();
      const listData = await this.limitDownService.generateAndSave(targetDate, !options.noSave);

      if (listData) {
        return {
          success: true,
          data: listData,
          errors: [],
          metadata: {
            date: targetDate,
            generatedAt: DateUtils.getCurrentDateTime(),
            type: 'limitDown'
          }
        };
      } else {
        return {
          success: false,
          data: null,
          errors: ['炸板股列表生成失败'],
          metadata: {
            date: targetDate,
            generatedAt: DateUtils.getCurrentDateTime(),
            type: 'limitDown'
          }
        };
      }

    } catch (error) {
      await logger.error('生成炸板股列表失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 生成完整数据（股票数据 + 分析结果）
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 完整数据结果
   */
  async generateCompleteData(date, options = {}) {
    try {
      await this.initializeDirectories();

      const targetDate = date || DateUtils.getCurrentDate();
      const result = {
        stockData: null,
        limitUp: null,
        limitDown: null
      };

      const errors = [];

      // 获取股票数据
      if (options.includeStockData !== false) {
        const stockResult = await this.fetchDateData(targetDate, options);
        if (stockResult.success) {
          result.stockData = stockResult.data;
        } else {
          errors.push(...stockResult.errors);
        }
      }

      // 生成涨停板天梯
      if (options.includeLimitUp !== false) {
        const limitUpResult = await this.generateLimitUpLadder(targetDate, options);
        if (limitUpResult.success) {
          result.limitUp = limitUpResult.data;
        } else {
          errors.push(...limitUpResult.errors);
        }
      }

      // 生成炸板股列表
      if (options.includeLimitDown !== false) {
        const limitDownResult = await this.generateExplodedList(targetDate, options);
        if (limitDownResult.success) {
          result.limitDown = limitDownResult.data;
        } else {
          errors.push(...limitDownResult.errors);
        }
      }

      return {
        success: errors.length === 0,
        data: result,
        errors: errors,
        metadata: {
          date: targetDate,
          generatedAt: DateUtils.getCurrentDateTime(),
          options: options
        }
      };

    } catch (error) {
      await logger.error('生成完整数据失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 刷新指定日期的缓存数据
   * @param {string} date - 日期字符串
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshData(date, options = {}) {
    try {
      const targetDate = date || DateUtils.getCurrentDate();
      const results = {};
      const errors = [];

      // 刷新上交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SSE) {
        try {
          results.sse = await this.sseService.refreshStockData(targetDate);
          if (results.sse) {
            logger.info(`上交所 ${targetDate} 数据刷新成功，共 ${results.sse.data.length} 条记录`);
          }
        } catch (error) {
          const errorMsg = `上交所 ${targetDate} 数据刷新失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      // 刷新深交所数据
      if (!options.exchange || options.exchange === EXCHANGES.SZSE) {
        try {
          results.szse = await this.eastMoneyService.refreshStockData(targetDate);
          if (results.szse) {
            logger.info(`深交所 ${targetDate} 数据刷新成功，共 ${results.szse.data.length} 条记录`);
          }
        } catch (error) {
          const errorMsg = `深交所 ${targetDate} 数据刷新失败: ${error.message}`;
          errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        errors: errors,
        metadata: {
          date: targetDate,
          refreshedAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      await logger.error('刷新缓存失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 获取缓存状态
   * @returns {Promise<Object>} 缓存状态
   */
  async getCacheStatus() {
    try {
      const sseFiles = await CacheService.listCachedFiles(EXCHANGES.SSE);
      const szseFiles = await CacheService.listCachedFiles(EXCHANGES.SZSE);

      return {
        success: true,
        data: {
          sse: {
            count: sseFiles.length,
            files: sseFiles
          },
          szse: {
            count: szseFiles.length,
            files: szseFiles
          }
        },
        errors: [],
        metadata: {
          checkedAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      await logger.error('获取缓存状态失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 清理过期缓存
   * @param {number} days - 保留天数
   * @returns {Promise<Object>} 清理结果
   */
  async cleanExpiredCache(days = 30) {
    try {
      const sseCleaned = await CacheService.cleanExpiredCache(EXCHANGES.SSE, days);
      const szseCleaned = await CacheService.cleanExpiredCache(EXCHANGES.SZSE, days);
      const totalCleaned = sseCleaned + szseCleaned;

      return {
        success: true,
        data: {
          totalCleaned: totalCleaned,
          sseCleaned: sseCleaned,
          szseCleaned: szseCleaned,
          keepDays: days
        },
        errors: [],
        metadata: {
          cleanedAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      await logger.error('清理缓存失败', error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 获取指定日期的交易日状态
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @param {boolean} checkHolidays - 是否检查节假日，默认true
   * @returns {Promise<Object>} 交易日状态信息
   */
  async getTradingDayStatus(date, checkHolidays = true) {
    try {
      if (!DateUtils.isValidDate(date)) {
        return {
          success: false,
          data: null,
          errors: ['无效的日期格式，请使用 YYYY-MM-DD 格式'],
          metadata: null
        };
      }

      const status = await DateUtils.getTradingDayStatus(date, checkHolidays, this.holidayService);

      return {
        success: true,
        data: status,
        errors: [],
        metadata: {
          date: date,
          checkedAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      await logger.error(`获取交易日状态失败: ${date}`, error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }

  /**
   * 获取最近的交易日
   * @param {string} baseDate - 基准日期字符串，默认为当前日期
   * @param {boolean} checkHolidays - 是否检查节假日，默认true
   * @param {number} maxDaysBack - 最大回溯天数，默认30天
   * @returns {Promise<Object>} 最近交易日信息
   */
  async getRecentTradingDay(baseDate = null, checkHolidays = true, maxDaysBack = 30) {
    try {
      const targetDate = baseDate || DateUtils.getCurrentDate();
      const recentTradingDay = await DateUtils.getRecentTradingDay(targetDate, checkHolidays, maxDaysBack, this.holidayService);

      return {
        success: true,
        data: {
          baseDate: targetDate,
          recentTradingDay: recentTradingDay,
          daysBack: Math.floor((new Date(targetDate) - new Date(recentTradingDay)) / (1000 * 60 * 60 * 24))
        },
        errors: [],
        metadata: {
          foundAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      await logger.error(`获取最近交易日失败: ${baseDate}`, error);
      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: null
      };
    }
  }
}

module.exports = StockDataGenerator;