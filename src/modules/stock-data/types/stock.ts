/**
 * 股票基础数据结构
 */
export interface StockData {
  /** 股票代码 */
  code: string
  /** 股票名称 */
  name: string
  /** 开盘价 */
  open: number
  /** 最高价 */
  high: number
  /** 最低价 */
  low: number
  /** 最新价 */
  last: number
  /** 昨收价 */
  prev_close: number
  /** 涨跌额 */
  change: number
  /** 涨跌幅 */
  chg_rate: number
  /** 涨跌幅(别名) */
  changePercent: number
  /** 成交量 */
  volume: number
  /** 成交额 */
  amount: number
  /** 交易阶段 */
  tradephase: string
  /** 振幅 */
  amp_rate: number
  /** 子类型 */
  cpxxsubtype: string
  /** 产品状态 */
  cpxxprodusta: string
  /** 排名 */
  rank?: number
  /** 交易所 */
  exchange?: string
  /** 板块类型 */
  boardType?: string
  /** 实际涨跌幅 */
  actualChangeRate?: number
  /** 涨跌幅阈值 */
  limitThreshold?: number
  /** 涨停限制 */
  limitRate?: number
  /** 昨收价(别名) */
  prevClose?: number
}

/**
 * 指数数据结构
 */
export interface IndexData {
  /** 指数代码 */
  code: string
  /** 指数名称 */
  name: string
  /** 当前点位 */
  current: number
  /** 涨跌点数 */
  change: number
  /** 涨跌幅 */
  chg_rate: number
  /** 开盘点位 */
  open: number
  /** 最高点位 */
  high: number
  /** 最低点位 */
  low: number
  /** 成交量 */
  volume: number
  /** 成交额 */
  amount: number
  /** 昨收点位 */
  prev_close: number
  /** 更新时间 */
  update_time: string
  /** 所属市场 */
  market: string
  /** 最新点位(别名) */
  last: number
  /** 振幅 */
  amp_rate: number
  /** 市值 */
  market_cap: number
  /** 市盈率 */
  pe: number
  /** 市净率 */
  pb: number
  /** 昨收点位(别名) */
  prevClose: number
}

/**
 * 市场统计数据结构
 */
export interface MarketStats {
  /** 总成交额 */
  total_amount: number
  /** 总成交量 */
  total_volume: number
  /** 涨停家数 */
  limit_up_count: number
  /** 跌停家数 */
  limit_down_count: number
  /** 上涨家数 */
  up_count: number
  /** 下跌家数 */
  down_count: number
  /** 平盘家数 */
  flat_count: number
  /** 数据更新时间 */
  update_time: string
}

/**
 * 数据获取日期响应结构
 */
export interface StockDataResponse {
  /** 数据获取日期 */
  fetchDate: string
  /** 数据日期 */
  date: string
  /** 股票数据列表 */
  data: StockData[]
}

/**
 * 指数数据响应结构
 */
export interface IndexDataResponse {
  /** 数据获取日期 */
  fetchDate: string
  /** 数据日期 */
  date: string
  /** 指数数据列表 */
  data: IndexData[]
}

/**
 * 市场统计响应结构
 */
export interface MarketStatsResponse {
  /** 数据获取日期 */
  fetchDate: string
  /** 数据日期 */
  date: string
  /** 市场统计数据 */
  data: MarketStats
}

/**
 * 数据源类型枚举
 */
export enum DataSourceType {
  /** 东方财富 */
  EASTMONEY = 'eastmoney',
  /** 上交所 */
  SSE = 'sse',
  /** 深交所 */
  SZSE = 'szse'
}

/**
 * 数据类型枚举
 */
export enum DataType {
  /** 上交所股票数据 */
  SSE = 'sse',
  /** 深交所股票数据 */
  SZSE = 'szse',
  /** 指数数据 */
  INDICES = 'indices',
  /** 涨停数据 */
  LIMIT_UP = 'limitup',
  /** 跌停数据 */
  LIMIT_DOWN = 'limitdown'
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 限流错误 */
  RATE_LIMIT = 'rate_limit',
  /** 认证错误 */
  AUTHENTICATION_ERROR = 'authentication_error',
  /** 禁止访问 */
  FORBIDDEN = 'forbidden',
  /** 资源未找到 */
  NOT_FOUND = 'not_found',
  /** 服务器错误 */
  SERVER_ERROR = 'server_error',
  /** 请求超时 */
  TIMEOUT = 'timeout',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * API响应基础接口 (从api.ts导入)
 */
export type ApiResponse<T = any> = import('./api').ApiResponse<T>