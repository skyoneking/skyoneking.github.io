import moment from 'moment'

/**
 * 日期工具类
 * 提供日期格式化、交易日验证等功能
 */
export class DateUtils {
  /**
   * 获取当前日期字符串 (YYYY-MM-DD)
   */
  static getCurrentDate(): string {
    return moment().format('YYYY-MM-DD')
  }

  /**
   * 获取当前日期时间字符串 (YYYY-MM-DD HH:mm:ss)
   */
  static getCurrentDateTime(): string {
    return moment().format('YYYY-MM-DD HH:mm:ss')
  }

  /**
   * 格式化日期
   * @param date 日期对象或字符串
   * @param format 格式化字符串
   */
  static formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
    return moment(date).format(format)
  }

  /**
   * 获取日期范围
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  static getDateRange(startDate: string, endDate: string): string[] {
    const start = moment(startDate)
    const end = moment(endDate)
    const dates: string[] = []

    while (start.isSameOrBefore(end)) {
      dates.push(start.format('YYYY-MM-DD'))
      start.add(1, 'day')
    }

    return dates
  }

  /**
   * 获取最近N天的日期
   * @param days 天数
   */
  static getRecentDays(days: number): string[] {
    const dates: string[] = []
    const today = moment()

    for (let i = 0; i < days; i++) {
      dates.push(today.clone().subtract(i, 'days').format('YYYY-MM-DD'))
    }

    return dates
  }

  /**
   * 验证是否为工作日
   * @param date 日期字符串
   */
  static isWeekday(date: string): boolean {
    const day = moment(date).day()
    return day !== 0 && day !== 6 // 0=周日, 6=周六
  }

  /**
   * 检查是否为交易日
   * @param date 日期字符串
   * @param checkHoliday 是否检查节假日
   * @param holidayService 节假日服务实例
   */
  static async isTradingDay(
    date: string,
    checkHoliday: boolean = true,
    holidayService?: any
  ): Promise<boolean> {
    // 如果是周末，直接返回false
    if (!this.isWeekday(date)) {
      return false
    }

    // 如果不检查节假日，返回true
    if (!checkHoliday || !holidayService) {
      return true
    }

    try {
      const isHoliday = await holidayService.isHoliday(date)
      return !isHoliday
    } catch (error) {
      console.warn('检查节假日失败:', error)
      return true // 出错时默认认为是交易日
    }
  }

  /**
   * 获取上一个交易日
   * @param date 当前日期
   * @param holidayService 节假日服务实例
   */
  static async getPreviousTradingDay(
    date: string,
    holidayService?: any
  ): Promise<string> {
    let currentDate = moment(date).subtract(1, 'day')

    while (true) {
      const dateStr = currentDate.format('YYYY-MM-DD')

      if (this.isWeekday(dateStr)) {
        if (holidayService) {
          const isHoliday = await holidayService.isHoliday(dateStr)
          if (!isHoliday) {
            return dateStr
          }
        } else {
          return dateStr
        }
      }

      currentDate.subtract(1, 'day')
    }
  }

  /**
   * 获取下一个交易日
   * @param date 当前日期
   * @param holidayService 节假日服务实例
   */
  static async getNextTradingDay(
    date: string,
    holidayService?: any
  ): Promise<string> {
    let currentDate = moment(date).add(1, 'day')

    while (true) {
      const dateStr = currentDate.format('YYYY-MM-DD')

      if (this.isWeekday(dateStr)) {
        if (holidayService) {
          const isHoliday = await holidayService.isHoliday(dateStr)
          if (!isHoliday) {
            return dateStr
          }
        } else {
          return dateStr
        }
      }

      currentDate.add(1, 'day')
    }
  }

  /**
   * 获取交易时间段
   * @param date 日期字符串
   */
  static getTradingTimeRange(date: string): { start: string; end: string } {
    return {
      start: `${date} 09:30:00`,
      end: `${date} 15:00:00`
    }
  }

  /**
   * 检查当前是否在交易时间
   */
  static isTradingTimeNow(): boolean {
    const now = moment()
    const dayOfWeek = now.day()

    // 周末不交易
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }

    // 检查时间 (9:30-15:00)
    const hour = now.hour()
    const minute = now.minute()

    if (hour < 9 || hour > 15) {
      return false
    }

    if (hour === 9 && minute < 30) {
      return false
    }

    if (hour === 15 && minute > 0) {
      return false
    }

    return true
  }

  /**
   * 验证交易日并抛出异常
   * @param date 日期字符串
   * @param checkHoliday 是否检查节假日
   * @param holidayService 节假日服务实例
   */
  static async validateTradingDay(
    date: string,
    checkHoliday: boolean = true,
    holidayService?: any
  ): Promise<void> {
    const isTrading = await this.isTradingDay(date, checkHoliday, holidayService)
    if (!isTrading) {
      throw new Error(`${date} 不是交易日`)
    }
  }
}