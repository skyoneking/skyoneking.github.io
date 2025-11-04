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

module.exports = {
  SSE_CONFIG,
  SZSE_CONFIG
};