/**
 * 常量配置文件
 */

const path = require('path');

// 文件路径配置
const PATHS = {
  DATA_DIR: path.join(process.cwd(), 'data'),
  SSE_DIR: path.join(process.cwd(), 'data', 'sse'),
  SZSE_DIR: path.join(process.cwd(), 'data', 'szse'),
  LOGS_DIR: path.join(process.cwd(), 'logs')
};

// 文件命名格式
const FILE_NAMES = {
  SSE_DATA: (date) => `${date}.json`,
  SZSE_DATA: (date) => `${date}.json`,
  LOG_FILE: (date) => `error-${date}.log`
};

// 数据格式
const DATA_FORMAT = {
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss'
};

// 交易所代码
const EXCHANGES = {
  SSE: 'SSE', // 上交所
  SZSE: 'SZSE' // 深交所
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
  LOG_LEVELS
};