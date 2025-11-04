const axios = require('axios');
const FileUtils = require('../utils/file-utils');
const DateUtils = require('../utils/date-utils');
const logger = require('../utils/logger');
const path = require('path');

/**
 * 节假日服务 - 获取中国A股交易日历信息
 */
class HolidayService {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache', 'holidays');
    this.apiEndpoint = 'https://api.apiopen.top/date/query';
  }

  /**
   * 确保缓存目录存在
   */
  async ensureCacheDir() {
    await FileUtils.ensureDir(this.cacheDir);
  }

  /**
   * 获取年份的缓存文件路径
   * @param {number} year - 年份
   * @returns {string} 缓存文件路径
   */
  getHolidayCachePath(year) {
    return path.join(this.cacheDir, `${year}.json`);
  }

  /**
   * 从API获取节假日数据
   * @param {number} year - 年份
   * @returns {Promise<Object>} 节假日数据
   */
  async fetchHolidaysFromAPI(year) {
    try {
      logger.info(`正在从API获取 ${year} 年节假日数据...`);

      const response = await axios.get(this.apiEndpoint, {
        params: {
          year: year,
          type: 'json'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && response.data.code === 200 && response.data.data) {
        const holidayData = {
          year: year,
          holidays: response.data.data.holidays || [],
          fetchedAt: DateUtils.getCurrentDateTime(),
          source: 'apiopen.top'
        };

        logger.info(`${year} 年节假日数据获取成功，共 ${holidayData.holidays.length} 条记录`);
        return holidayData;
      } else {
        throw new Error(`API返回数据格式错误: ${JSON.stringify(response.data)}`);
      }

    } catch (error) {
      logger.error(`获取 ${year} 年节假日数据失败`, error);

      // 如果API失败，返回基础数据（只包含周末）
      const basicHolidays = this.generateBasicHolidays(year);
      return {
        year: year,
        holidays: basicHolidays,
        fetchedAt: DateUtils.getCurrentDateTime(),
        source: 'generated',
        error: error.message
      };
    }
  }

  /**
   * 生成基础的节假日数据（仅包含周末）
   * @param {number} year - 年份
   * @returns {Array} 基础节假日列表
   */
  generateBasicHolidays(year) {
    const holidays = [];
    const startDate = new Date(year, 0, 1); // 年初
    const endDate = new Date(year, 11, 31); // 年末

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // 周六(6)和周日(0)是周末
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        holidays.push({
          date: DateUtils.formatDate(currentDate),
          name: dayOfWeek === 0 ? '星期日' : '星期六',
          type: 'weekend',
          isHoliday: true
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    logger.info(`生成 ${year} 年基础节假日数据，共 ${holidays.length} 个周末`);
    return holidays;
  }

  /**
   * 从缓存获取节假日数据
   * @param {number} year - 年份
   * @returns {Promise<Object|null>} 节假日数据，不存在返回null
   */
  async getHolidaysFromCache(year) {
    try {
      const cachePath = this.getHolidayCachePath(year);

      if (await FileUtils.fileExists(cachePath)) {
        const cachedData = await FileUtils.readJsonFile(cachePath);

        // 检查缓存是否过期（超过1年）
        const cachedDate = new Date(cachedData.fetchedAt);
        const now = new Date();
        const daysDiff = Math.floor((now - cachedDate) / (1000 * 60 * 60 * 24));

        if (daysDiff < 365) {
          logger.info(`从缓存读取 ${year} 年节假日数据`);
          return cachedData;
        } else {
          logger.info(`${year} 年节假日缓存已过期，将重新获取`);
          return null;
        }
      }

      return null;
    } catch (error) {
      logger.error(`读取 ${year} 年节假日缓存失败`, error);
      return null;
    }
  }

  /**
   * 保存节假日数据到缓存
   * @param {Object} holidayData - 节假日数据
   * @returns {Promise<boolean>} 是否保存成功
   */
  async saveHolidaysToCache(holidayData) {
    try {
      await this.ensureCacheDir();

      const cachePath = this.getHolidayCachePath(holidayData.year);
      await FileUtils.writeJsonFile(cachePath, holidayData);

      logger.info(`${holidayData.year} 年节假日数据已缓存到: ${cachePath}`);
      return true;
    } catch (error) {
      logger.error(`保存 ${holidayData.year} 年节假日缓存失败`, error);
      return false;
    }
  }

  /**
   * 获取指定年份的节假日数据
   * @param {number} year - 年份
   * @param {boolean} forceRefresh - 是否强制刷新
   * @returns {Promise<Object>} 节假日数据
   */
  async getHolidays(year, forceRefresh = false) {
    try {
      // 首先尝试从缓存获取
      if (!forceRefresh) {
        const cachedData = await this.getHolidaysFromCache(year);
        if (cachedData) {
          return cachedData;
        }
      }

      // 从API获取数据
      const holidayData = await this.fetchHolidaysFromAPI(year);

      // 保存到缓存
      await this.saveHolidaysToCache(holidayData);

      return holidayData;

    } catch (error) {
      logger.error(`获取 ${year} 年节假日数据失败`, error);

      // 返回基础数据作为备用
      const basicHolidays = this.generateBasicHolidays(year);
      return {
        year: year,
        holidays: basicHolidays,
        fetchedAt: DateUtils.getCurrentDateTime(),
        source: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * 检查指定日期是否为节假日
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {Promise<Object>} 检查结果
   */
  async isHoliday(date) {
    try {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();

      // 获取该年的节假日数据
      const holidayData = await this.getHolidays(year);

      // 查找该日期是否在节假日列表中
      const holiday = holidayData.holidays.find(h => h.date === date);

      if (holiday) {
        return {
          isHoliday: true,
          date: date,
          name: holiday.name,
          type: holiday.type || 'unknown',
          source: holidayData.source
        };
      } else {
        return {
          isHoliday: false,
          date: date,
          source: holidayData.source
        };
      }

    } catch (error) {
      logger.error(`检查 ${date} 节假日状态失败`, error);

      // 如果检查失败，使用基础的周末判断
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      return {
        isHoliday: isWeekend,
        date: date,
        name: isWeekend ? (dayOfWeek === 0 ? '星期日' : '星期六') : '',
        type: isWeekend ? 'weekend' : 'none',
        source: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * 刷新指定年份的节假日缓存
   * @param {number} year - 年份
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshHolidayCache(year) {
    try {
      logger.info(`开始刷新 ${year} 年节假日缓存...`);

      const holidayData = await this.getHolidays(year, true);

      return {
        success: true,
        data: holidayData,
        metadata: {
          year: year,
          refreshedAt: DateUtils.getCurrentDateTime(),
          holidayCount: holidayData.holidays.length
        }
      };

    } catch (error) {
      logger.error(`刷新 ${year} 年节假日缓存失败`, error);

      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: {
          year: year,
          refreshedAt: DateUtils.getCurrentDateTime()
        }
      };
    }
  }

  /**
   * 获取缓存状态
   * @returns {Promise<Object>} 缓存状态信息
   */
  async getCacheStatus() {
    try {
      await this.ensureCacheDir();

      const files = await FileUtils.listFiles(this.cacheDir);
      const currentYear = new Date().getFullYear();

      const cacheInfo = [];

      for (const file of files) {
        const year = parseInt(file.replace('.json', ''));
        const cachePath = this.getHolidayCachePath(year);
        const cachedData = await FileUtils.readJsonFile(cachePath);

        const cacheDate = new Date(cachedData.fetchedAt);
        const now = new Date();
        const daysDiff = Math.floor((now - cacheDate) / (1000 * 60 * 60 * 24));
        const isExpired = daysDiff >= 365;

        cacheInfo.push({
          year: year,
          file: file,
          fetchedAt: cachedData.fetchedAt,
          holidayCount: cachedData.holidays.length,
          source: cachedData.source,
          daysOld: daysDiff,
          isExpired: isExpired,
          isCurrentYear: year === currentYear
        });
      }

      return {
        success: true,
        data: {
          cacheDir: this.cacheDir,
          totalFiles: cacheInfo.length,
          currentYear: currentYear,
          files: cacheInfo.sort((a, b) => b.year - a.year)
        },
        errors: [],
        metadata: {
          checkedAt: DateUtils.getCurrentDateTime()
        }
      };

    } catch (error) {
      logger.error('获取节假日缓存状态失败', error);

      return {
        success: false,
        data: null,
        errors: [error.message],
        metadata: {
          checkedAt: DateUtils.getCurrentDateTime()
        }
      };
    }
  }
}

module.exports = HolidayService;