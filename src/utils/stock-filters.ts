/**
 * 股票过滤工具函数
 * 用于过滤ST股票和停牌股票
 */

/**
 * 检测是否为ST或*ST股票
 * @param name 股票名称
 * @returns 是否为ST股票
 */
export function isSTStock(name: string): boolean {
  if (!name) return false
  // 检测ST和*ST开头的股票
  return name.startsWith('ST') || name.startsWith('*ST')
}

/**
 * 检测是否为停牌股票
 * @param tradephase 交易阶段
 * @param name 股票名称
 * @returns 是否为停牌股票
 */
export function isSuspendedStock(tradephase: string, name: string): boolean {
  if (!tradephase || !name) return true

  // 检查交易阶段，"T111    " 表示正常交易
  const normalTradingPhase = "T111    "
  if (tradephase.trim() !== normalTradingPhase.trim()) {
    return true
  }

  // 检查股票名称中的停牌标识
  const suspendedKeywords = ['停牌', '终止上市', '退市', '暂停上市']
  return suspendedKeywords.some(keyword => name.includes(keyword))
}

/**
 * 判断股票是否应该被过滤
 * @param stock 股票数据对象
 * @returns 是否应该过滤该股票
 */
export function shouldFilterStock(stock: any): boolean {
  if (!stock) return true

  // 检查ST股票
  if (isSTStock(stock.name)) {
    return true
  }

  // 检查停牌股票
  if (isSuspendedStock(stock.tradephase, stock.name)) {
    return true
  }

  return false
}

/**
 * 过滤股票数组，移除ST股票和停牌股票
 * @param stocks 股票数组
 * @param options 过滤选项
 * @returns 过滤后的股票数组和统计信息
 */
export function filterStocks(stocks: any[], options: {
  includeST?: boolean
  includeSuspended?: boolean
} = {}): {
  filteredStocks: any[]
  statistics: {
    total: number
    filtered: number
    stCount: number
    suspendedCount: number
    retainedCount: number
  }
} {
  const { includeST = false, includeSuspended = false } = options

  let stCount = 0
  let suspendedCount = 0
  let retainedCount = 0

  const filteredStocks = stocks.filter(stock => {
    const isST = isSTStock(stock.name)
    const isSuspended = isSuspendedStock(stock.tradephase, stock.name)

    // 统计
    if (isST) stCount++
    if (isSuspended) suspendedCount++

    // 过滤规则
    if (isST && !includeST) {
      return false
    }

    if (isSuspended && !includeSuspended) {
      return false
    }

    retainedCount++
    return true
  })

  const statistics = {
    total: stocks.length,
    filtered: stocks.length - filteredStocks.length,
    stCount,
    suspendedCount,
    retainedCount
  }

  return { filteredStocks, statistics }
}

/**
 * 获取股票类型分类
 * @param stock 股票数据对象
 * @returns 股票类型字符串
 */
export function getStockCategory(stock: any): string {
  if (!stock) return '未知'

  if (isSTStock(stock.name)) {
    return 'ST股票'
  }

  if (isSuspendedStock(stock.tradephase, stock.name)) {
    return '停牌股票'
  }

  return '正常股票'
}