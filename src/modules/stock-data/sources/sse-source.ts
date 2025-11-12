import { BaseDataSource } from './base-source'
import {
  DataSourceConfig,
  ApiResponse,
  StockDataResponse,
  IndexDataResponse,
  RequestConfig,
  StockData,
  IndexData,
  ErrorType
} from '../types'

/**
 * 上交所数据源实现
 * 提供上海证券交易所官方API的数据获取功能
 */
export class SSEDataSource extends BaseDataSource {
  // 上交所API端点
  private readonly endpoints = {
    // 股票列表查询
    stockList: 'http://query.sse.com.cn/commonQuery.do',
    // 实时行情
    realtimeData: 'http://query.sse.com.cn/commonQuery.do',
    // 历史数据
    historyData: 'http://query.sse.com.cn/commonQuery.do',
    // 指数数据
    indexData: 'http://query.sse.com.cn/commonQuery.do',
    // 分股数据
    marketData: 'http://query.sse.com.cn/commonQuery.do'
  }

  constructor(config?: Partial<DataSourceConfig>) {
    const defaultConfig: DataSourceConfig = {
      name: 'SSE',
      type: 'sse',
      baseUrl: 'http://query.sse.com.cn',
      enabled: true,
      priority: 2,
      requestConfig: {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'http://www.sse.com.cn/',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Connection': 'keep-alive'
        }
      }
    }

    super({ ...defaultConfig, ...config })
  }

  /**
   * 获取上交所股票数据
   */
  async getSSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
    if (!this.validateDate(date)) {
      return {
        success: false,
        data: null as any,
        message: '无效的日期格式，请使用YYYY-MM-DD格式',
        status: 400,
        errorType: ErrorType.UNKNOWN_ERROR,
        timestamp: Date.now()
      }
    }

    return this.handleRequest(async () => {
      const params = {
        jsonCallBack: `jsonpCallback${Date.now()}`,
        isPagination: 'false',
        sqlId: 'COMMON_SSE_XXPL_LB_GSXX_L',
        pageHelp: {
          begin: 0,
          end: 9999,
          pageSize: 1000
        },
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.stockList, '', params)
      const response = await this.fetchSSEData(url, config)

      return this.parseSSEStockData(response, date)
    }, ErrorType.NETWORK_ERROR)
  }

  /**
   * 获取深交所股票数据（上交所不提供，返回空数据）
   */
  async getSZSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
    return {
      success: false,
      data: {
        fetchDate: new Date().toISOString(),
        date,
        data: []
      },
      message: '上交所数据源不提供深交所数据',
      status: 200,
      errorType: ErrorType.NOT_FOUND,
      timestamp: Date.now()
    }
  }

  /**
   * 获取指数数据
   */
  async getIndexData(date: string, config?: RequestConfig): Promise<ApiResponse<IndexDataResponse>> {
    if (!this.validateDate(date)) {
      return {
        success: false,
        data: null as any,
        message: '无效的日期格式，请使用YYYY-MM-DD格式',
        status: 400,
        errorType: ErrorType.UNKNOWN_ERROR,
        timestamp: Date.now()
      }
    }

    return this.handleRequest(async () => {
      const params = {
        jsonCallBack: `jsonpCallback${Date.now()}`,
        isPagination: 'false',
        sqlId: 'COMMON_SSE_XXPL_ZSXX_L',
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.indexData, '', params)
      const response = await this.fetchSSEData(url, config)

      return this.parseSSEIndexData(response, date)
    }, ErrorType.NETWORK_ERROR)
  }

  /**
   * 获取涨停数据
   */
  async getLimitUpData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
    if (!this.validateDate(date)) {
      return {
        success: false,
        data: null as any,
        message: '无效的日期格式，请使用YYYY-MM-DD格式',
        status: 400,
        errorType: ErrorType.UNKNOWN_ERROR,
        timestamp: Date.now()
      }
    }

    return this.handleRequest(async () => {
      const params = {
        jsonCallBack: `jsonpCallback${Date.now()}`,
        isPagination: 'false',
        sqlId: 'COMMON_SSE_XXPL_ZTXX_L',
        pageHelp: {
          begin: 0,
          end: 9999,
          pageSize: 1000
        },
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.marketData, '', params)
      const response = await this.fetchSSEData(url, config)

      return this.parseSSEStockData(response, date)
    }, ErrorType.NETWORK_ERROR)
  }

  /**
   * 获取跌停数据
   */
  async getLimitDownData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
    if (!this.validateDate(date)) {
      return {
        success: false,
        data: null as any,
        message: '无效的日期格式，请使用YYYY-MM-DD格式',
        status: 400,
        errorType: ErrorType.UNKNOWN_ERROR,
        timestamp: Date.now()
      }
    }

    return this.handleRequest(async () => {
      const params = {
        jsonCallBack: `jsonpCallback${Date.now()}`,
        isPagination: 'false',
        sqlId: 'COMMON_SSE_XXPL_DTXX_L',
        pageHelp: {
          begin: 0,
          end: 9999,
          pageSize: 1000
        },
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.marketData, '', params)
      const response = await this.fetchSSEData(url, config)

      return this.parseSSEStockData(response, date)
    }, ErrorType.NETWORK_ERROR)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 尝试获取少量数据作为健康检查
      const response = await this.getSSEData(new Date().toISOString().split('T')[0])
      return response.success
    } catch (error) {
      return false
    }
  }

  /**
   * 获取上交所数据
   */
  private async fetchSSEData(url: string, config?: RequestConfig): Promise<any> {
    const headers = this.buildHeaders(config?.headers)

    // 上交所API需要特殊处理
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(config?.timeout || this.config.requestConfig?.timeout || 15000),
      // 上交所可能需要模拟浏览器行为
      mode: 'cors',
      credentials: 'omit'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    // 处理JSONP响应
    if (text.includes('jsonpCallback')) {
      const jsonpMatch = text.match(/jsonpCallback\d+\((.*)\)/)
      if (jsonpMatch) {
        return JSON.parse(jsonpMatch[1])
      }
    }

    throw new Error('无法解析上交所API响应')
  }

  /**
   * 解析上交所股票数据
   */
  private parseSSEStockData(response: any, date: string): StockDataResponse {
    if (!response || !response.result) {
      throw new Error('无效的上交所响应数据格式')
    }

    const stocks: StockData[] = response.result.map((item: any) => ({
      code: item.ACCOUNT_CODE || item.STOCK_CODE || '',
      name: item.SECURITY_NAME_ABBR || item.STOCK_NAME || '',
      open: this.parseNumber(item.OPEN_PRICE),
      high: this.parseNumber(item.HIGH_PRICE),
      low: this.parseNumber(item.LOW_PRICE),
      last: this.parseNumber(item.NEW_PRICE || item.CURRENT_PRICE),
      prev_close: this.parseNumber(item.PRE_CLOSE_PRICE),
      change: this.parseNumber(item.CHANGE_AMOUNT),
      chg_rate: this.parseNumber(item.CHANGE_RATE),
      volume: this.parseNumber(item.TRADE_VOLUME),
      amount: this.parseNumber(item.TRADE_AMOUNT),
      tradephase: item.TRADE_STATUS || '正常',
      amp_rate: this.parseNumber(item.AMPLITUDE),
      cpxxsubtype: item.PRODUCT_TYPE || 'ASH',
      cpxxprodusta: item.LISTING_STATUS || '   D  F  N          '
    }))

    return {
      fetchDate: new Date().toISOString(),
      date,
      data: stocks
    }
  }

  /**
   * 解析上交所指数数据
   */
  private parseSSEIndexData(response: any, date: string): IndexDataResponse {
    if (!response || !response.result) {
      throw new Error('无效的上交所指数响应数据格式')
    }

    const indices: IndexData[] = response.result.map((item: any) => ({
      code: item.INDEX_CODE || '',
      name: item.INDEX_NAME || '',
      current: this.parseNumber(item.NEW_PRICE || item.CURRENT_INDEX),
      change: this.parseNumber(item.CHANGE_AMOUNT),
      chg_rate: this.parseNumber(item.CHANGE_RATE),
      open: this.parseNumber(item.OPEN_INDEX),
      high: this.parseNumber(item.HIGH_INDEX),
      low: this.parseNumber(item.LOW_INDEX),
      volume: this.parseNumber(item.TRADE_VOLUME),
      amount: this.parseNumber(item.TRADE_AMOUNT),
      prev_close: this.parseNumber(item.PRE_CLOSE_INDEX),
      update_time: item.UPDATE_TIME || new Date().toISOString()
    }))

    return {
      fetchDate: new Date().toISOString(),
      date,
      data: indices
    }
  }

  /**
   * 解析数字
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '' || value === '-') {
      return 0
    }

    // 处理可能的字符串格式（如包含逗号）
    const cleanValue = String(value).replace(/,/g, '').trim()
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * 构建上交所特有的URL参数
   */
  private buildSSEUrl(baseUrl: string, params: Record<string, any>): string {
    const url = new URL(baseUrl)

    // 上交所API的参数格式特殊处理
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          // 处理嵌套对象参数
          url.searchParams.append(key, JSON.stringify(value))
        } else {
          url.searchParams.append(key, String(value))
        }
      }
    })

    return url.toString()
  }

  /**
   * 重写URL构建方法以适应上交所API
   */
  protected buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
    const fullPath = path ? `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : baseUrl
    return this.buildSSEUrl(fullPath, params || {})
  }
}