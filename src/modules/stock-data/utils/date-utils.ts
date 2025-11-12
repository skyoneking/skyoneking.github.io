/**
 * 日期工具函数
 */

/**
 * 获取当前日期字符串 (YYYY-MM-DD格式)
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * 获取当前日期时间字符串 (ISO格式)
 */
export function getCurrentDateTime(): string {
  return new Date().toISOString()
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 解析日期字符串
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }
  return date
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * 添加天数到日期
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * 减去天数到日期
 */
export function subtractDays(date: Date | string, days: number): Date {
  return addDays(date, -days)
}

/**
 * 获取两个日期之间的天数差
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    throw new Error('Invalid date')
  }

  const timeDiff = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * 检查是否是交易日（排除周末）
 * 注意：这只是简单检查，不考虑节假日
 */
export function isTradingDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  const dayOfWeek = d.getDay()
  return dayOfWeek !== 0 && dayOfWeek !== 6 // 0是周日，6是周六
}

/**
 * 获取最近的交易日
 */
export function getRecentTradingDay(date?: Date | string): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  let tradingDay = new Date(d)

  // 如果当前日期不是交易日，向前查找最近的交易日
  while (!isTradingDay(tradingDay)) {
    tradingDay = subtractDays(tradingDay, 1)
  }

  return formatDate(tradingDay)
}

/**
 * 获取指定日期范围内的所有交易日
 */
export function getTradingDays(startDate: Date | string, endDate: Date | string): string[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date')
  }

  if (start > end) {
    throw new Error('Start date must be before end date')
  }

  const tradingDays: string[] = []
  let currentDate = new Date(start)

  while (currentDate <= end) {
    if (isTradingDay(currentDate)) {
      tradingDays.push(formatDate(currentDate))
    }
    currentDate = addDays(currentDate, 1)
  }

  return tradingDays
}

/**
 * 获取过去N个交易日
 */
export function getPastTradingDays(days: number, endDate?: Date | string): string[] {
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : new Date()
  if (isNaN(end.getTime())) {
    throw new Error('Invalid date')
  }

  const tradingDays: string[] = []
  let currentDate = new Date(end)
  let foundDays = 0

  while (foundDays < days) {
    currentDate = subtractDays(currentDate, 1)
    if (isTradingDay(currentDate)) {
      tradingDays.push(formatDate(currentDate))
      foundDays++
    }
  }

  return tradingDays.reverse() // 按时间顺序排列
}

/**
 * 获取指定月份的第一个交易日
 */
export function getFirstTradingDayOfMonth(year: number, month: number): string {
  const firstDay = new Date(year, month - 1, 1)
  return getRecentTradingDay(firstDay)
}

/**
 * 获取指定月份的最后一个交易日
 */
export function getLastTradingDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0) // 下个月的第0天就是这个月的最后一天
  let tradingDay = new Date(lastDay)

  // 如果最后一天不是交易日，向前查找
  while (!isTradingDay(tradingDay)) {
    tradingDay = subtractDays(tradingDay, 1)
  }

  return formatDate(tradingDay)
}

/**
 * 检查日期是否在指定范围内
 */
export function isDateInRange(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (isNaN(d.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date')
  }

  return d >= start && d <= end
}

/**
 * 获取日期的季度
 */
export function getQuarter(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  return Math.floor(d.getMonth() / 3) + 1
}

/**
 * 获取日期的年份
 */
export function getYear(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  return d.getFullYear()
}

/**
 * 获取日期的月份
 */
export function getMonth(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date')
  }

  return d.getMonth() + 1 // getMonth() 返回 0-11，需要加1
}