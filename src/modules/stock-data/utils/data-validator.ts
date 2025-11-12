import { StockData, IndexData, MarketStats } from '../types'

/**
 * 数据验证工具
 */

/**
 * 验证股票数据
 */
export function validateStockData(data: any): data is StockData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const requiredFields = ['code', 'name', 'open', 'high', 'low', 'last', 'prev_close']

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      return false
    }
  }

  // 验证代码格式
  if (typeof data.code !== 'string' || !/^[0-9A-Za-z]{6}$/.test(data.code)) {
    return false
  }

  // 验证价格数据
  const numericFields = ['open', 'high', 'low', 'last', 'prev_close', 'change', 'chg_rate', 'changePercent', 'volume', 'amount']
  for (const field of numericFields) {
    if (field in data) {
      const value = data[field]
      if (typeof value !== 'number' || isNaN(value)) {
        return false
      }
    }
  }

  // 验证价格逻辑关系
  const { open, high, low, last, prev_close } = data
  if (high < low || high < open || high < last || low > open || low > last) {
    return false
  }

  // 验证涨幅计算
  if (prev_close > 0) {
    const expectedChangeRate = ((last - prev_close) / prev_close) * 100
    if (Math.abs(expectedChangeRate - data.chg_rate) > 0.01) { // 允许0.01%的误差
      return false
    }
  }

  return true
}

/**
 * 验证股票数据数组
 */
export function validateStockDataArray(data: any): data is StockData[] {
  if (!Array.isArray(data)) {
    return false
  }

  return data.every(item => validateStockData(item))
}

/**
 * 验证指数数据
 */
export function validateIndexData(data: any): data is IndexData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const requiredFields = ['code', 'name', 'current', 'prev_close']

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      return false
    }
  }

  // 验证代码格式
  if (typeof data.code !== 'string' || data.code.length < 3) {
    return false
  }

  // 验证价格数据
  const numericFields = ['current', 'change', 'chg_rate', 'changePercent', 'open', 'high', 'low', 'volume', 'amount', 'prev_close']
  for (const field of numericFields) {
    if (field in data) {
      const value = data[field]
      if (typeof value !== 'number' || isNaN(value)) {
        return false
      }
    }
  }

  // 验证价格逻辑关系
  const { current, open, high, low, prev_close } = data
  if (high < low || high < open || high < current || low > open || low > current) {
    return false
  }

  // 验证涨幅计算
  if (prev_close > 0) {
    const expectedChangeRate = ((current - prev_close) / prev_close) * 100
    if (Math.abs(expectedChangeRate - data.chg_rate) > 0.01) { // 允许0.01%的误差
      return false
    }
  }

  return true
}

/**
 * 验证指数数据数组
 */
export function validateIndexDataArray(data: any): data is IndexData[] {
  if (!Array.isArray(data)) {
    return false
  }

  return data.every(item => validateIndexData(item))
}

/**
 * 验证市场统计数据
 */
export function validateMarketStats(data: any): data is MarketStats {
  if (!data || typeof data !== 'object') {
    return false
  }

  const requiredFields = ['total_amount', 'total_volume', 'limit_up_count', 'limit_down_count', 'up_count', 'down_count', 'flat_count']

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      return false
    }
  }

  // 验证数值字段
  const numericFields = ['total_amount', 'total_volume', 'limit_up_count', 'limit_down_count', 'up_count', 'down_count', 'flat_count']
  for (const field of numericFields) {
    const value = data[field]
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      return false
    }
  }

  // 验证统计数据逻辑
  const { up_count, down_count, flat_count, limit_up_count, limit_down_count } = data

  // 涨停股票应该是上涨股票的子集
  if (limit_up_count > up_count || limit_down_count > down_count) {
    return false
  }

  // 验证时间格式
  if (data.update_time && typeof data.update_time !== 'string') {
    return false
  }

  return true
}

/**
 * 验证日期格式
 */
export function validateDate(dateString: string): boolean {
  if (typeof dateString !== 'string') {
    return false
  }

  // 验证 YYYY-MM-DD 格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * 验证时间戳格式
 */
export function validateTimestamp(timestamp: string | number): boolean {
  if (typeof timestamp === 'number') {
    return timestamp > 0 && timestamp <= Date.now() + 24 * 60 * 60 * 1000 // 允许未来1天的时间
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp)
    return !isNaN(date.getTime())
  }

  return false
}

/**
 * 验证股票代码格式
 */
export function validateStockCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false
  }

  // A股代码通常是6位数字或字母数字组合
  const stockCodeRegex = /^[0-9A-Za-z]{6}$/
  return stockCodeRegex.test(code)
}

/**
 * 验证价格数据
 */
export function validatePrice(price: any): price is number {
  if (typeof price !== 'number') {
    return false
  }

  return !isNaN(price) && price >= 0 && price <= 999999 // 合理的价格范围
}

/**
 * 验证成交量数据
 */
export function validateVolume(volume: any): volume is number {
  if (typeof volume !== 'number') {
    return false
  }

  return !isNaN(volume) && volume >= 0 && volume <= Number.MAX_SAFE_INTEGER
}

/**
 * 验证成交额数据
 */
export function validateAmount(amount: any): amount is number {
  if (typeof amount !== 'number') {
    return false
  }

  return !isNaN(amount) && amount >= 0 && amount <= Number.MAX_SAFE_INTEGER
}

/**
 * 验证百分比数据（如涨跌幅）
 */
export function validatePercentage(percentage: any): percentage is number {
  if (typeof percentage !== 'number') {
    return false
  }

  return !isNaN(percentage) && percentage >= -100 && percentage <= 100
}

/**
 * 清理和标准化股票数据
 */
export function cleanStockData(rawData: any): StockData | null {
  if (!rawData || typeof rawData !== 'object') {
    return null
  }

  try {
    const cleaned: StockData = {
      code: String(rawData.code || '').trim(),
      name: String(rawData.name || '').trim(),
      open: validatePrice(rawData.open) ? rawData.open : 0,
      high: validatePrice(rawData.high) ? rawData.high : 0,
      low: validatePrice(rawData.low) ? rawData.low : 0,
      last: validatePrice(rawData.last) ? rawData.last : 0,
      prev_close: validatePrice(rawData.prev_close) ? rawData.prev_close : 0,
      change: validatePrice(rawData.change) ? rawData.change : 0,
      chg_rate: validatePercentage(rawData.chg_rate) ? rawData.chg_rate : 0,
      volume: validateVolume(rawData.volume) ? rawData.volume : 0,
      amount: validateAmount(rawData.amount) ? rawData.amount : 0,
      tradephase: String(rawData.tradephase || '').trim(),
      amp_rate: validatePercentage(rawData.amp_rate) ? rawData.amp_rate : 0,
      changePercent: validatePercentage(rawData.chg_rate) ? rawData.chg_rate : 0,
      cpxxsubtype: String(rawData.cpxxsubtype || '').trim(),
      cpxxprodusta: String(rawData.cpxxprodusta || '').trim()
    }

    // 重新计算变化量以确保数据一致性
    if (cleaned.prev_close > 0) {
      cleaned.change = cleaned.last - cleaned.prev_close
      cleaned.chg_rate = (cleaned.change / cleaned.prev_close) * 100
      cleaned.changePercent = cleaned.chg_rate
    }

    // 确保高低价的逻辑正确
    cleaned.high = Math.max(cleaned.open, cleaned.high, cleaned.last)
    cleaned.low = Math.min(cleaned.open, cleaned.low, cleaned.last)

    return cleaned
  } catch (error) {
    console.warn('Failed to clean stock data:', error)
    return null
  }
}

/**
 * 批量清理股票数据
 */
export function cleanStockDataArray(rawData: any[]): StockData[] {
  if (!Array.isArray(rawData)) {
    return []
  }

  return rawData
    .map(item => cleanStockData(item))
    .filter((item): item is StockData => item !== null)
}

/**
 * 数据完整性检查
 */
export function checkDataIntegrity(data: StockData[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(data) || data.length === 0) {
    errors.push('数据为空或格式不正确')
    return { isValid: false, errors, warnings }
  }

  // 检查数据重复
  const codes = new Set<string>()
  const duplicates: string[] = []

  for (const item of data) {
    if (codes.has(item.code)) {
      duplicates.push(item.code)
    } else {
      codes.add(item.code)
    }
  }

  if (duplicates.length > 0) {
    warnings.push(`发现重复的股票代码: ${duplicates.join(', ')}`)
  }

  // 检查异常价格
  const abnormalPrices: string[] = []
  for (const item of data) {
    if (item.prev_close > 0) {
      const changeRate = Math.abs(item.chg_rate)
      if (changeRate > 20) { // 涨跌幅超过20%可能异常
        abnormalPrices.push(`${item.code} (${item.name}): ${item.chg_rate.toFixed(2)}%`)
      }
    }
  }

  if (abnormalPrices.length > 0) {
    warnings.push(`发现异常涨跌幅: ${abnormalPrices.slice(0, 5).join(', ')}`)
  }

  // 检查零价格
  const zeroPrices: string[] = []
  for (const item of data) {
    if (item.last === 0 && item.prev_close === 0) {
      zeroPrices.push(`${item.code} (${item.name})`)
    }
  }

  if (zeroPrices.length > 0) {
    errors.push(`发现零价格股票: ${zeroPrices.slice(0, 5).join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}