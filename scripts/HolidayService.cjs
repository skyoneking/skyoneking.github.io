/**
 * 节假日服务
 * 负责处理中国股市交易日历，包括周末、节假日和调休工作日的检测
 */

const fs = require('fs');
const path = require('path');

class HolidayService {
  constructor() {
    this.holidays = this.initHolidayDatabase();
    this.workdays = this.initWorkdayDatabase();
  }

  /**
   * 初始化2025年节假日数据库
   */
  initHolidayDatabase() {
    return {
      "2025": {
        // 元旦
        "2025-01-01": { type: "holiday", name: "元旦" },

        // 春节
        "2025-01-28": { type: "holiday", name: "春节" },
        "2025-01-29": { type: "holiday", name: "春节" },
        "2025-01-30": { type: "holiday", name: "春节" },
        "2025-01-31": { type: "holiday", name: "春节" },
        "2025-02-01": { type: "holiday", name: "春节" },
        "2025-02-02": { type: "holiday", name: "春节" },
        "2025-02-03": { type: "holiday", name: "春节" },

        // 春节调休工作日
        "2025-01-26": { type: "workday", name: "春节调休" },
        "2025-02-08": { type: "workday", name: "春节调休" },

        // 清明节
        "2025-04-05": { type: "holiday", name: "清明节" },
        "2025-04-06": { type: "holiday", name: "清明节" },
        "2025-04-07": { type: "holiday", name: "清明节" },

        // 劳动节
        "2025-05-01": { type: "holiday", name: "劳动节" },
        "2025-05-02": { type: "holiday", name: "劳动节" },
        "2025-05-03": { type: "holiday", name: "劳动节" },
        "2025-05-04": { type: "holiday", name: "劳动节" },
        "2025-05-05": { type: "holiday", name: "劳动节" },

        // 劳动节调休工作日
        "2025-04-27": { type: "workday", name: "劳动节调休" },
        "2025-05-11": { type: "workday", name: "劳动节调休" },

        // 端午节
        "2025-05-31": { type: "holiday", name: "端午节" },
        "2025-06-01": { type: "holiday", name: "端午节" },
        "2025-06-02": { type: "holiday", name: "端午节" },

        // 端午节调休工作日
        "2025-06-08": { type: "workday", name: "端午节调休" },

        // 中秋节
        "2025-10-06": { type: "holiday", name: "中秋节" },

        // 国庆节
        "2025-10-01": { type: "holiday", name: "国庆节" },
        "2025-10-02": { type: "holiday", name: "国庆节" },
        "2025-10-03": { type: "holiday", name: "国庆节" },
        "2025-10-04": { type: "holiday", name: "国庆节" },
        "2025-10-05": { type: "holiday", name: "国庆节" },
        "2025-10-07": { type: "holiday", name: "国庆节" },

        // 国庆节调休工作日
        "2025-09-28": { type: "workday", name: "国庆节调休" },
        "2025-10-12": { type: "workday", name: "国庆节调休" }
      }
    };
  }

  /**
   * 初始化其他年份的调休工作日数据库
   */
  initWorkdayDatabase() {
    return {
      // 这里可以扩展其他年份的数据
    };
  }

  /**
   * 检查是否为周末
   */
  isWeekend(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0=周日, 6=周六
  }

  /**
   * 检查是否为节假日
   */
  isHoliday(dateStr) {
    const year = dateStr.substring(0, 4);
    const yearHolidays = this.holidays[year];

    if (!yearHolidays) {
      return false;
    }

    const holiday = yearHolidays[dateStr];
    return holiday && holiday.type === 'holiday';
  }

  /**
   * 检查是否为调休工作日
   */
  isWorkday(dateStr) {
    const year = dateStr.substring(0, 4);
    const yearHolidays = this.holidays[year];

    if (!yearHolidays) {
      return false;
    }

    const holiday = yearHolidays[dateStr];
    return holiday && holiday.type === 'workday';
  }

  /**
   * 检查是否为交易日
   */
  isTradingDay(dateStr) {
    // 首先检查是否为调休工作日
    if (this.isWorkday(dateStr)) {
      return true;
    }

    // 然后检查是否为周末或节假日
    return !this.isWeekend(dateStr) && !this.isHoliday(dateStr);
  }

  /**
   * 获取节假日信息
   */
  getHolidayInfo(dateStr) {
    const year = dateStr.substring(0, 4);
    const yearHolidays = this.holidays[year];

    if (!yearHolidays) {
      return null;
    }

    return yearHolidays[dateStr] || null;
  }

  /**
   * 生成指定日期范围内的交易日列表
   */
  generateTradingDays(startDate, endDate) {
    const tradingDays = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 确保开始日期不大于结束日期
    if (start > end) {
      return [];
    }

    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = this.formatDate(currentDate);

      if (this.isTradingDay(dateStr)) {
        tradingDays.push({
          date: dateStr,
          weekday: this.getWeekdayName(currentDate.getDay()),
          holidayInfo: this.getHolidayInfo(dateStr)
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return tradingDays;
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取星期名称
   */
  getWeekdayName(dayOfWeek) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[dayOfWeek];
  }

  /**
   * 获取前一个交易日
   */
  getPreviousTradingDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);

    while (true) {
      const prevDateStr = this.formatDate(date);
      if (this.isTradingDay(prevDateStr)) {
        return prevDateStr;
      }
      date.setDate(date.getDate() - 1);

      // 防止无限循环，最多回溯30天
      if (date < new Date(dateStr).setDate(date.getDate() - 30)) {
        return null;
      }
    }
  }

  /**
   * 获取后一个交易日
   */
  getNextTradingDay(dateStr) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);

    while (true) {
      const nextDateStr = this.formatDate(date);
      if (this.isTradingDay(nextDateStr)) {
        return nextDateStr;
      }
      date.setDate(date.getDate() + 1);

      // 防止无限循环，最多前进30天
      if (date > new Date(dateStr).setDate(date.getDate() + 30)) {
        return null;
      }
    }
  }

  /**
   * 获取指定天数内的交易日数量
   */
  countTradingDays(startDate, endDate) {
    const tradingDays = this.generateTradingDays(startDate, endDate);
    return tradingDays.length;
  }

  /**
   * 打印交易日统计信息
   */
  printTradingDayStats(startDate, endDate) {
    const tradingDays = this.generateTradingDays(startDate, endDate);
    const allDays = Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`\n=== 交易日统计 (${startDate} ~ ${endDate}) ===`);
    console.log(`总天数: ${allDays}`);
    console.log(`交易日: ${tradingDays.length}`);
    console.log(`非交易日: ${allDays - tradingDays.length}`);

    // 统计非交易日类型
    let weekendCount = 0;
    let holidayCount = 0;

    const currentDate = new Date(startDate);
    while (currentDate <= new Date(endDate)) {
      const dateStr = this.formatDate(currentDate);
      if (!this.isTradingDay(dateStr)) {
        if (this.isWeekend(dateStr)) {
          weekendCount++;
        } else if (this.isHoliday(dateStr)) {
          holidayCount++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`周末天数: ${weekendCount}`);
    console.log(`节假日天数: ${holidayCount}`);
    console.log(`调休工作日: ${tradingDays.filter(d => d.holidayInfo && d.holidayInfo.type === 'workday').length}`);

    return tradingDays;
  }

  /**
   * 保存节假日数据到文件
   */
  saveToFile(filePath) {
    const data = {
      holidays: this.holidays,
      workdays: this.workdays,
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Holiday data saved to: ${filePath}`);
  }

  /**
   * 从文件加载节假日数据
   */
  loadFromFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.holidays = data.holidays || this.holidays;
        this.workdays = data.workdays || this.workdays;
        console.log(`Holiday data loaded from: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to load holiday data from ${filePath}:`, error.message);
    }
  }

  /**
   * 添加自定义节假日
   */
  addHoliday(dateStr, type, name) {
    const year = dateStr.substring(0, 4);

    if (!this.holidays[year]) {
      this.holidays[year] = {};
    }

    this.holidays[year][dateStr] = { type, name };
    console.log(`Added ${type}: ${dateStr} - ${name}`);
  }

  /**
   * 移除节假日
   */
  removeHoliday(dateStr) {
    const year = dateStr.substring(0, 4);

    if (this.holidays[year] && this.holidays[year][dateStr]) {
      delete this.holidays[year][dateStr];
      console.log(`Removed holiday: ${dateStr}`);
    }
  }
}

module.exports = HolidayService;