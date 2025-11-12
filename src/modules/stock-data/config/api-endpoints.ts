/**
 * API端点配置
 */

import { DataSourceType, DataType } from '../types'

/**
 * 东方财富API端点
 */
export const EASTMONEY_ENDPOINTS = {
  // 股票详情数据
  STOCK_DETAIL: 'http://push2.eastmoney.com/api/qt/stock/details/get',
  // 实时行情数据
  REALTIME_DATA: 'http://push2.eastmoney.com/api/qt/stock/get',
  // 涨跌停数据
  LIMIT_DATA: 'http://push2.eastmoney.com/api/qt/clist/get',
  // 指数数据
  INDEX_DATA: 'http://push2.eastmoney.com/api/qt/stock/get',
  // 分时数据
  TIME_DATA: 'http://push2.eastmoney.com/api/qt/stock/trends2/get',
  // K线数据
  KLINE_DATA: 'http://push2his.eastmoney.com/api/qt/stock/kline/get',
  // 板块数据
  SECTOR_DATA: 'http://push2.eastmoney.com/api/qt/clist/get',
  // 新闻数据
  NEWS_DATA: 'http://news.eastmoney.com/api/news/list',
  // 资金流向数据
  FLOW_DATA: 'http://push2.eastmoney.com/api/qt/stock/fflow/kline/get'
}

/**
 * 上交所API端点
 */
export const SSE_ENDPOINTS = {
  // 股票列表查询
  STOCK_LIST: 'http://query.sse.com.cn/commonQuery.do',
  // 实时行情
  REALTIME_DATA: 'http://query.sse.com.cn/commonQuery.do',
  // 历史数据
  HISTORY_DATA: 'http://query.sse.com.cn/commonQuery.do',
  // 指数数据
  INDEX_DATA: 'http://query.sse.com.cn/commonQuery.do',
  // 涨停数据
  LIMIT_UP_DATA: 'http://query.sse.com.cn/commonQuery.do',
  // 跌停数据
  LIMIT_DOWN_DATA: 'http://query.sse.com.cn/commonQuery.do',
  // 市场概况
  MARKET_OVERVIEW: 'http://query.sse.com.cn/commonQuery.do',
  // 公司公告
  ANNOUNCEMENT: 'http://query.sse.com.cn/commonQuery.do'
}

/**
 * 深交所API端点
 */
export const SZSE_ENDPOINTS = {
  // 股票列表查询
  STOCK_LIST: 'http://www.szse.cn/api/report/ShowReport/data',
  // 实时行情
  REALTIME_DATA: 'http://www.szse.cn/api/report/ShowReport/data',
  // 历史数据
  HISTORY_DATA: 'http://www.szse.cn/api/report/ShowReport/data',
  // 指数数据
  INDEX_DATA: 'http://www.szse.cn/api/report/ShowReport/data',
  // 涨停数据
  LIMIT_UP_DATA: 'http://www.szse.cn/api/report/ShowReport/data',
  // 跌停数据
  LIMIT_DOWN_DATA: 'http://www.szse.cn/api/report/ShowReport/data',
  // 市场统计
  MARKET_STATS: 'http://www.szse.cn/api/report/ShowReport/data',
  // 公司信息
  COMPANY_INFO: 'http://www.szse.cn/api/report/ShowReport/data',
  // 公告信息
  ANNOUNCEMENT: 'http://www.szse.cn/api/disclosure/list/posted'
}

/**
 * 东方财富API参数映射
 */
export const EASTMONEY_PARAMS = {
  // 上交所股票查询参数
  SSE_QUERY: {
    cb: 'jsonpCallback',
    pn: 1,
    pz: 5000,
    po: 1,
    np: 1,
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: 2,
    invt: 2,
    fid: 'f3',
    fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
    fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
  },
  // 深交所股票查询参数
  SZSE_QUERY: {
    cb: 'jsonpCallback',
    pn: 1,
    pz: 5000,
    po: 1,
    np: 1,
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: 2,
    invt: 2,
    fid: 'f3',
    fs: 'm:0+t:6,m:0+t:81,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
    fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
  },
  // 指数查询参数
  INDEX_QUERY: {
    cb: 'jsonpCallback',
    fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152',
    secids: '1.000001,1.000002,1.000300,1.000905,1.000688,1.000016,0.399001,0.399005,0.399006'
  },
  // 涨跌停查询参数
  LIMIT_QUERY: {
    cb: 'jsonpCallback',
    pn: 1,
    pz: 5000,
    po: 1,
    np: 1,
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: 2,
    invt: 2,
    fid: 'f3',
    fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23',
    fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152'
  }
}

/**
 * 上交所API参数映射
 */
export const SSE_PARAMS = {
  // 股票列表查询
  STOCK_LIST: {
    jsonCallBack: 'jsonpCallback',
    isPagination: 'false',
    sqlId: 'COMMON_SSE_XXPL_LB_GSXX_L',
    pageHelp: {
      begin: 0,
      end: 9999,
      pageSize: 1000
    }
  },
  // 指数查询
  INDEX_QUERY: {
    jsonCallBack: 'jsonpCallback',
    isPagination: 'false',
    sqlId: 'COMMON_SSE_XXPL_ZSXX_L'
  },
  // 涨停数据查询
  LIMIT_UP_QUERY: {
    jsonCallBack: 'jsonpCallback',
    isPagination: 'false',
    sqlId: 'COMMON_SSE_XXPL_ZTXX_L',
    pageHelp: {
      begin: 0,
      end: 9999,
      pageSize: 1000
    }
  },
  // 跌停数据查询
  LIMIT_DOWN_QUERY: {
    jsonCallBack: 'jsonpCallback',
    isPagination: 'false',
    sqlId: 'COMMON_SSE_XXPL_DTXX_L',
    pageHelp: {
      begin: 0,
      end: 9999,
      pageSize: 1000
    }
  }
}

/**
 * 深交所API参数映射
 */
export const SZSE_PARAMS = {
  // 股票查询
  STOCK_QUERY: {
    SHOWTYPE: 'JSON',
    TABCAT: '1215',
    CAT: 'DYB',
    SEC_CODE: '',
    SEC_NAME: ''
  },
  // 指数查询
  INDEX_QUERY: {
    SHOWTYPE: 'JSON',
    TABCAT: '1210',
    CAT: 'ZB'
  },
  // 涨停查询
  LIMIT_UP_QUERY: {
    SHOWTYPE: 'JSON',
    TABCAT: '1215',
    CAT: 'ZT'
  },
  // 跌停查询
  LIMIT_DOWN_QUERY: {
    SHOWTYPE: 'JSON',
    TABCAT: '1215',
    CAT: 'DT'
  }
}

/**
 * 数据类型与API端点映射
 */
export const DATATYPE_ENDPOINT_MAP: Record<string, any> = {
  [DataType.SSE]: {
    primary: EASTMONEY_ENDPOINTS.REALTIME_DATA,
    fallback: SSE_ENDPOINTS.STOCK_LIST,
    params: EASTMONEY_PARAMS.SSE_QUERY
  },
  [DataType.SZSE]: {
    primary: EASTMONEY_ENDPOINTS.REALTIME_DATA,
    fallback: SZSE_ENDPOINTS.STOCK_LIST,
    params: EASTMONEY_PARAMS.SZSE_QUERY
  },
  [DataType.INDICES]: {
    primary: EASTMONEY_ENDPOINTS.INDEX_DATA,
    fallback: SSE_ENDPOINTS.INDEX_DATA,
    params: EASTMONEY_PARAMS.INDEX_QUERY
  },
  [DataType.LIMIT_UP]: {
    primary: EASTMONEY_ENDPOINTS.LIMIT_DATA,
    fallback: SSE_ENDPOINTS.LIMIT_UP_DATA,
    params: EASTMONEY_PARAMS.LIMIT_QUERY
  },
  [DataType.LIMIT_DOWN]: {
    primary: EASTMONEY_ENDPOINTS.LIMIT_DATA,
    fallback: SSE_ENDPOINTS.LIMIT_DOWN_DATA,
    params: EASTMONEY_PARAMS.LIMIT_QUERY
  }
}

/**
 * 数据源优先级配置
 */
export const DATA_SOURCE_PRIORITY: Record<string, number> = {
  [DataSourceType.EASTMONEY]: 1,
  [DataSourceType.SSE]: 2,
  [DataSourceType.SZSE]: 3
}

/**
 * 请求超时配置（毫秒）
 */
export const TIMEOUT_CONFIG: Record<string, number> = {
  [DataSourceType.EASTMONEY]: 10000,
  [DataSourceType.SSE]: 15000,
  [DataSourceType.SZSE]: 15000,
  DEFAULT: 12000
}

/**
 * 重试配置
 */
export const RETRY_CONFIG: Record<string, any> = {
  [DataSourceType.EASTMONEY]: {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000
  },
  [DataSourceType.SSE]: {
    maxAttempts: 2,
    baseDelay: 2000,
    backoffMultiplier: 2,
    maxDelay: 8000
  },
  [DataSourceType.SZSE]: {
    maxAttempts: 2,
    baseDelay: 2000,
    backoffMultiplier: 2,
    maxDelay: 8000
  }
}

/**
 * 请求频率限制配置
 */
export const RATE_LIMIT_CONFIG: Record<string, any> = {
  [DataSourceType.EASTMONEY]: {
    minInterval: 2000,  // 最小间隔2秒
    maxInterval: 5000,  // 最大间隔5秒
    maxConcurrent: 2   // 最大并发数2
  },
  [DataSourceType.SSE]: {
    minInterval: 3000,  // 最小间隔3秒
    maxInterval: 8000,  // 最大间隔8秒
    maxConcurrent: 1   // 最大并发数1
  },
  [DataSourceType.SZSE]: {
    minInterval: 3000,  // 最小间隔3秒
    maxInterval: 8000,  // 最大间隔8秒
    maxConcurrent: 1   // 最大并发数1
  }
}

/**
 * 导出所有配置常量
 */
export * from './default-config'