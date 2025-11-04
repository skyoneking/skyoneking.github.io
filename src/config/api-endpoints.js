/**
 * API端点配置文件
 */

// 上交所API配置
const SSE_CONFIG = {
  baseURL: 'https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity',
  defaultParams: {
    callback: 'jsonpCallback3485725',
    select: 'code,name,open,high,low,last,prev_close,chg_rate,volume,amount,tradephase,change,amp_rate,cpxxsubtype,cpxxprodusta',
    order: '',
    begin: 0,
    end: 9999
  },
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.sse.com.cn/'
  }
};

// 深交所API配置
const SZSE_CONFIG = {
  baseURL: 'http://www.szse.cn/api/report/ShowReport',
  endpoints: {
    stockList: {
      CATALOGID: '1110',
      TAB: 'tab1'
    },
    realtimeQuotes: {
      CATALOGID: '1110',
      TAB: 'tab2'
    }
  },
  defaultParams: {
    SHOWTYPE: 'JSON'
  },
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'http://www.szse.cn/'
  }
};

// 东方财富API配置
const EASTMONEY_CONFIG = {
  baseURL: 'http://push2.eastmoney.com',
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'http://quote.eastmoney.com/',
    'Accept': 'application/json, text/plain, */*'
  }
};

// 指数代码配置
const INDEX_CODES = {
  '000001.SH': {
    code: '000001.SH',
    name: '上证指数',
    market: 'SH',
    fullCode: '1.000001',
    description: '上海证券交易所综合股价指数'
  },
  '399001.SZ': {
    code: '399001.SZ',
    name: '深证成指',
    market: 'SZ',
    fullCode: '0.399001',
    description: '深圳证券交易所成份股价指数'
  }
};

// API端点定义
const API_ENDPOINTS = {
  // 上交所端点
  SSE: SSE_CONFIG.baseURL,

  // 深交所端点
  SZSE: SZSE_CONFIG.baseURL,

  // 东方财富端点
  EASTMONEY: {
    INDEX: `${EASTMONEY_CONFIG.baseURL}/api/qt/stock/get`,
    MARKET: `${EASTMONEY_CONFIG.baseURL}/api/qt/ulist.np/get`,
    SEARCH: `${EASTMONEY_CONFIG.baseURL}/api/qt/clist/get`
  },

  // 指数数据字段
  INDEX_FIELDS: 'f43,f44,f45,f2,f18,f4,f170,f5,f6,f7,f8,f9,f23,f12,f14,f127,f128'
};

module.exports = {
  SSE_CONFIG,
  SZSE_CONFIG,
  EASTMONEY_CONFIG,
  API_ENDPOINTS,
  INDEX_CODES
};