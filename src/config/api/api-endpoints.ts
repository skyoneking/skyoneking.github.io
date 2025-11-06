/**
 * API 端点配置
 * 定义各种数据源和接口地址
 */

// 东方财富 API 端点
export const EASTMONEY = {
  // 上证指数
  INDEX: 'http://push2.eastmoney.com/api/qt/stock/get',
  // 深证成指数据
  SZSE_DATA: 'http://9.push2.eastmoney.com/api/qt/stock/details/get',
  // 涨跌停数据
  LIMIT_DATA: 'http://push2.eastmoney.com/api/qt/clist/get',
  // 分时数据
  TIME_DATA: 'http://push2.eastmoney.com/api/qt/stock/trends2/get',
  // K线数据
  KLINE_DATA: 'http://push2his.eastmoney.com/api/qt/stock/kline/get'
}

// 上证所 API 端点
export const SSE = {
  // 实时行情数据
  REALTIME: 'http://query.sse.com.cn/commonQuery.do',
  // 历史数据
  HISTORY: 'http://query.sse.com.cn/commonQuery.do',
  // 指数数据
  INDEX: 'http://query.sse.com.cn/commonQuery.do'
}

// 数据源配置
export const DATA_SOURCES = {
  SSE: 'SSE',
  EASTMONEY: 'EASTMONEY',
  SZSE: 'SZSE'
}

// 股票代码映射
export const INDEX_CODES = {
  '000001.SH': {
    name: '上证指数',
    market: '上海',
    code: '000001',
    exchange: 'SH'
  },
  '399001.SZ': {
    name: '深证成指',
    market: '深圳',
    code: '399001',
    exchange: 'SZ'
  }
}

// 请求配置
export const REQUEST_CONFIG = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
}

// 缓存配置
export const CACHE_CONFIG = {
  TTL: 24 * 60 * 60 * 1000, // 24小时
  MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30天
  CLEANUP_INTERVAL: 60 * 60 * 1000 // 1小时清理一次
}

// 数据类型枚举
export enum DataType {
  SSE = 'sse',
  SZSE = 'szse',
  LIMIT_UP = 'limitup',
  LIMIT_DOWN = 'limitdown',
  INDICES = 'indices'
}

// 交易状态枚举
export enum TradingStatus {
  TRADING = 'E110',    // 交易中
  PRE_MARKET = 'E105', // 盘前
  POST_MARKET = 'E106', // 盘后
  CLOSED = 'E999'      // 已闭市
}