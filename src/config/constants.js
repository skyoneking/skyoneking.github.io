/**
 * 常量配置文件
 */

const path = require('path');

// 文件路径配置
const PATHS = {
  DATA_DIR: path.join(process.cwd(), 'data'),
  SSE_DIR: path.join(process.cwd(), 'data', 'sse'),
  SZSE_DIR: path.join(process.cwd(), 'data', 'szse'),
  INDICES_DIR: path.join(process.cwd(), 'data', 'indices'),
  CACHE_DIR: path.join(process.cwd(), 'cache'),
  HOLIDAYS_CACHE_DIR: path.join(process.cwd(), 'cache', 'holidays'),
  INDICES_CACHE_DIR: path.join(process.cwd(), 'cache', 'indices'),
  LOGS_DIR: path.join(process.cwd(), 'logs')
};

// 文件命名格式
const FILE_NAMES = {
  SSE_DATA: (date) => `${date}.json`,
  SZSE_DATA: (date) => `${date}.json`,
  INDICES_DATA: (date) => `${date}.json`,
  LOG_FILE: (date) => `error-${date}.log`,
  HOLIDAYS_DATA: (year) => `${year}.json`
};

// 数据格式
const DATA_FORMAT = {
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIME_FORMAT: 'HH:mm:ss'
};

// 交易所代码
const EXCHANGES = {
  SSE: 'SSE', // 上交所
  SZSE: 'SZSE' // 深交所
};

// 指数代码
const INDICES = {
  SHANGHAI_COMPOSITE: '000001.SH', // 上证指数
  SHENZHEN_COMPONENT: '399001.SZ'  // 深证成指
};

// 指数名称映射
const INDEX_NAMES = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指'
};

// 市场代码
const MARKETS = {
  SH: '1', // 上海市场
  SZ: '0'  // 深圳市场
};

// API响应状态
const API_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial'
};

// 缓存配置
const CACHE_CONFIG = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24小时
  HOLIDAYS_TTL: 30 * 24 * 60 * 60 * 1000, // 30天
  INDICES_TTL: 24 * 60 * 60 * 1000 // 24小时
};

// 日志级别
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

module.exports = {
  PATHS,
  FILE_NAMES,
  DATA_FORMAT,
  EXCHANGES,
  INDICES,
  INDEX_NAMES,
  MARKETS,
  API_STATUS,
  CACHE_CONFIG,
  LOG_LEVELS
};