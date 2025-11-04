const moment = require('moment');
const { DATA_FORMAT } = require('../config/constants');
const { NonTradingDayError } = require('./errors');

/**
 * 日期工具函数
 */
class DateUtils {
  /**
   * 获取当前日期字符串
   * @returns {string} 格式为 YYYY-MM-DD
   */
  static getCurrentDate() {
    return moment().format(DATA_FORMAT.DATE_FORMAT);
  }

  /**
   * 获取当前日期时间字符串
   * @returns {string} 格式为 YYYY-MM-DD HH:mm:ss
   */
  static getCurrentDateTime() {
    return moment().format(DATA_FORMAT.DATETIME_FORMAT);
  }

  /**
   * 格式化日期
   * @param {Date|string} date - 日期对象或日期字符串
   * @returns {string} 格式化后的日期字符串
   */
  static formatDate(date) {
    return moment(date).format(DATA_FORMAT.DATE_FORMAT);
  }

  /**
   * 格式化日期时间
   * @param {Date|string} date - 日期对象或日期字符串
   * @returns {string} 格式化后的日期时间字符串
   */
  static formatDateTime(date) {
    return moment(date).format(DATA_FORMAT.DATETIME_FORMAT);
  }

  /**
   * 验证日期格式是否正确
   * @param {string} dateString - 日期字符串
   * @returns {boolean} 是否为有效的日期格式
   */
  static isValidDate(dateString) {
    return moment(dateString, DATA_FORMAT.DATE_FORMAT, true).isValid();
  }

  /**
   * 获取指定日期范围的日期数组
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Array} 日期数组
   */
  static getDateRange(startDate, endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    const dates = [];

    while (start.isSameOrBefore(end)) {
      dates.push(start.format(DATA_FORMAT.DATE_FORMAT));
      start.add(1, 'day');
    }

    return dates;
  }

  /**
   * 获取前N天的日期
   * @param {number} days - 天数
   * @returns {string} 日期字符串
   */
  static getPreviousDate(days = 1) {
    return moment().subtract(days, 'days').format(DATA_FORMAT.DATE_FORMAT);
  }

  /**
   * 检查是否为交易日（简单实现，排除周末）
   * @param {string} dateString - 日期字符串
   * @returns {boolean} 是否为交易日
   */
  static isTradingDay(dateString) {
    const date = moment(dateString);
    const dayOfWeek = date.day();
    // 排除周六(6)和周日(0)
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  /**
   * 检查是否为交易日（增强版本，考虑节假日）
   * @param {string} dateString - 日期字符串
   * @param {boolean} checkHolidays - 是否检查节假日，默认为true
   * @param {Object} holidayService - 节假日服务实例（可选）
   * @returns {Promise<Object>} 交易日状态信息
   */
  static async getTradingDayStatus(dateString, checkHolidays = true, holidayService = null) {
    try {
      // 首先验证日期格式
      if (!this.isValidDate(dateString)) {
        return {
          isTradingDay: false,
          date: dateString,
          status: 'invalid_date',
          reason: '日期格式无效',
          suggestion: '请使用 YYYY-MM-DD 格式的日期'
        };
      }

      // 基础周末检查
      const date = moment(dateString);
      const dayOfWeek = date.day();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
          isTradingDay: false,
          date: dateString,
          status: 'weekend',
          reason: dayOfWeek === 0 ? '星期日' : '星期六',
          suggestion: '请选择工作日获取数据'
        };
      }

      // 检查节假日
      if (checkHolidays && holidayService) {
        try {
          const holidayInfo = await holidayService.isHoliday(dateString);

          if (holidayInfo.isHoliday) {
            return {
              isTradingDay: false,
              date: dateString,
              status: 'holiday',
              reason: holidayInfo.name,
              suggestion: '请选择非节假日的工作日获取数据',
              holidayInfo: holidayInfo
            };
          }
        } catch (error) {
          // 节假日检查失败，记录警告但继续
          console.warn(`节假日检查失败: ${error.message}，将使用基础判断`);
        }
      }

      return {
        isTradingDay: true,
        date: dateString,
        status: 'trading_day',
        reason: '正常交易日'
      };

    } catch (error) {
      return {
        isTradingDay: false,
        date: dateString,
        status: 'error',
        reason: `检查失败: ${error.message}`,
        suggestion: '请检查日期格式或稍后重试'
      };
    }
  }

  /**
   * 验证是否为交易日，如果不是则抛出错误
   * @param {string} dateString - 日期字符串
   * @param {boolean} checkHolidays - 是否检查节假日，默认为true
   * @param {Object} holidayService - 节假日服务实例（可选）
   * @throws {NonTradingDayError} 非交易日时抛出错误
   */
  static async validateTradingDay(dateString, checkHolidays = true, holidayService = null) {
    const status = await this.getTradingDayStatus(dateString, checkHolidays, holidayService);

    if (!status.isTradingDay) {
      throw new NonTradingDayError(
        dateString,
        status.reason,
        status.suggestion
      );
    }

    return status;
  }

  /**
   * 获取最近的交易日（增强版本）
   * @param {string} dateString - 基准日期字符串，默认为当前日期
   * @param {boolean} checkHolidays - 是否检查节假日，默认为true
   * @param {number} maxDaysBack - 最大回溯天数，默认30天
   * @param {Object} holidayService - 节假日服务实例（可选）
   * @returns {Promise<string>} 最近的交易日字符串
   */
  static async getRecentTradingDay(dateString = null, checkHolidays = true, maxDaysBack = 30, holidayService = null) {
    const baseDate = dateString ? moment(dateString) : moment();
    let tradingDay = baseDate.clone();

    // 向前查找最近的交易日
    for (let i = 0; i < maxDaysBack; i++) {
      const currentDateStr = tradingDay.format(DATA_FORMAT.DATE_FORMAT);

      if (checkHolidays) {
        try {
          const status = await this.getTradingDayStatus(currentDateStr, checkHolidays, holidayService);
          if (status.isTradingDay) {
            return currentDateStr;
          }
        } catch (error) {
          // 如果节假日检查失败，使用基础判断
          if (this.isTradingDay(currentDateStr)) {
            return currentDateStr;
          }
        }
      } else {
        // 使用基础判断
        if (this.isTradingDay(currentDateStr)) {
          return currentDateStr;
        }
      }

      tradingDay = tradingDay.subtract(1, 'day');
    }

    // 如果超过最大回溯天数仍未找到交易日，返回基准日期
    throw new Error(`在过去${maxDaysBack}天内未找到交易日: ${baseDate.format(DATA_FORMAT.DATE_FORMAT)}`);
  }

  /**
   * 获取指定日期范围内的所有交易日
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @param {boolean} checkHolidays - 是否检查节假日，默认为true
   * @returns {Promise<Array>} 交易日数组
   */
  static async getTradingDaysInRange(startDate, endDate, checkHolidays = true) {
    const dates = this.getDateRange(startDate, endDate);
    const tradingDays = [];

    for (const date of dates) {
      try {
        const status = await this.getTradingDayStatus(date, checkHolidays);
        if (status.isTradingDay) {
          tradingDays.push(date);
        }
      } catch (error) {
        // 跳过检查失败的日期
        console.warn(`跳过日期 ${date} 的交易日检查: ${error.message}`);
      }
    }

    return tradingDays;
  }

  /**
   * 获取最近的交易日（向后兼容版本）
   * @param {string} dateString - 基准日期字符串，默认为当前日期
   * @returns {string} 最近的交易日字符串
   */
  static getRecentTradingDaySimple(dateString = null) {
    const baseDate = dateString ? moment(dateString) : moment();
    let tradingDay = baseDate;

    // 向前查找最近的交易日
    while (!this.isTradingDay(tradingDay.format(DATA_FORMAT.DATE_FORMAT))) {
      tradingDay = tradingDay.subtract(1, 'day');
    }

    return tradingDay.format(DATA_FORMAT.DATE_FORMAT);
  }
}

module.exports = DateUtils;