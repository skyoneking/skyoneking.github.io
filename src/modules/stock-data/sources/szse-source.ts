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
 * 深交所数据源实现
 * 提供深圳证券交易所官方API的数据获取功能
 */
export class SZSEDataSource extends BaseDataSource {
  // 深交所API端点
  private readonly endpoints = {
    // 股票列表查询
    stockList: 'http://www.szse.cn/api/report/ShowReport/data',
    // 实时行情
    realtimeData: 'http://www.szse.cn/api/report/ShowReport/data',
    // 历史数据
    historyData: 'http://www.szse.cn/api/report/ShowReport/data',
    // 指数数据
    indexData: 'http://www.szse.cn/api/report/ShowReport/data',
    // 市场统计
    marketStats: 'http://www.szse.cn/api/report/ShowReport/data'
  }

  constructor(config?: Partial<DataSourceConfig>) {
    const defaultConfig: DataSourceConfig = {
      name: 'SZSE',
      type: 'szse',
      baseUrl: 'http://www.szse.cn',
      enabled: true,
      priority: 3,
      requestConfig: {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'http://www.szse.cn/',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    }

    super({ ...defaultConfig, ...config })
  }

  /**
   * 获取上交所股票数据（深交所不提供，返回空数据）
   */
  async getSSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
    return {
      success: false,
      data: {
        fetchDate: new Date().toISOString(),
        date,
        data: []
      },
      message: '深交所数据源不提供上交所数据',
      status: 200,
      errorType: ErrorType.NOT_FOUND,
      timestamp: Date.now()
    }
  }

  /**
   * 获取深交所股票数据
   */
  async getSZSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>> {
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
        SHOWTYPE: 'JSON',
        TABCAT: '1215',
        CAT: 'DYB',
        SEC_CODE: '',
        SEC_NAME: '',
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.stockList, '', params)
      const response = await this.fetchSZSEData(url, config)

      return this.parseSZSEStockData(response, date)
    }, ErrorType.NETWORK_ERROR)
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
        SHOWTYPE: 'JSON',
        TABCAT: '1210',
        CAT: 'ZB',
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.indexData, '', params)
      const response = await this.fetchSZSEData(url, config)

      return this.parseSZSEIndexData(response, date)
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
        SHOWTYPE: 'JSON',
        TABCAT: '1215',
        CAT: 'ZT',
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.marketStats, '', params)
      const response = await this.fetchSZSEData(url, config)

      return this.parseSZSEStockData(response, date)
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
        SHOWTYPE: 'JSON',
        TABCAT: '1215',
        CAT: 'DT',
        _: Date.now()
      }

      const url = this.buildUrl(this.endpoints.marketStats, '', params)
      const response = await this.fetchSZSEData(url, config)

      return this.parseSZSEStockData(response, date)
    }, ErrorType.NETWORK_ERROR)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 尝试获取少量数据作为健康检查
      const response = await this.getSZSEData(new Date().toISOString().split('T')[0])
      return response.success
    } catch (error) {
      return false
    }
  }

  /**
   * 获取深交所数据
   */
  private async fetchSZSEData(url: string, config?: RequestConfig): Promise<any> {
    const headers = this.buildHeaders(config?.headers)

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(config?.timeout || this.config.requestConfig?.timeout || 15000),
      mode: 'cors',
      credentials: 'omit'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    // 深交所API通常返回JSON格式，但有时也会有回调
    if (text.includes('callback')) {
      const jsonpMatch = text.match(/callback\d+\((.*)\)/)
      if (jsonpMatch) {
        return JSON.parse(jsonpMatch[1])
      }
    }

    try {
      return JSON.parse(text)
    } catch (error) {
      throw new Error('无法解析深交所API响应')
    }
  }

  /**
   * 解析深交所股票数据
   */
  private parseSZSEStockData(response: any, date: string): StockDataResponse {
    if (!response || !response.data) {
      throw new Error('无效的深交所响应数据格式')
    }

    const stocks: StockData[] = response.data.map((item: any) => ({
      code: item.zqdm || item.gsdm || '',
      name: item.mc || item.gsmc || '',
      open: this.parseNumber(item.kpj),
      high: this.parseNumber(item.zgj),
      low: this.parseNumber(item.zdj),
      last: this.parseNumber(item.zjcj),
      prev_close: this.parseNumber(item.zs),
      change: this.parseNumber(item.zde),
      chg_rate: this.parseNumber(item.zdf),
      volume: this.parseNumber(item.cjl),
      amount: this.parseNumber(item.cje),
      tradephase: item.jyzt || '正常',
      amp_rate: this.parseNumber(item.zf),
      cpxxsubtype: item.sslb || 'ASH',
      cpxxprodusta: item.ssgs || '   D  F  N          '
    }))

    return {
      fetchDate: new Date().toISOString(),
      date,
      data: stocks
    }
  }

  /**
   * 解析深交所指数数据
   */
  private parseSZSEIndexData(response: any, date: string): IndexDataResponse {
    if (!response || !response.data) {
      throw new Error('无效的深交所指数响应数据格式')
    }

    const indices: IndexData[] = response.data.map((item: any) => ({
      code: item.zqdm || '',
      name: item.mc || '',
      current: this.parseNumber(item.zjcj),
      change: this.parseNumber(item.zde),
      chg_rate: this.parseNumber(item.zdf),
      open: this.parseNumber(item.kpj),
      high: this.parseNumber(item.zgj),
      low: this.parseNumber(item.zdj),
      volume: this.parseNumber(item.cjl),
      amount: this.parseNumber(item.cje),
      prev_close: this.parseNumber(item.zs),
      update_time: item.gxsj || new Date().toISOString()
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

    // 处理可能的字符串格式（如包含逗号、空格等）
    const cleanValue = String(value).replace(/[,]/g, '').trim()
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * 构建深交所特有的URL参数
   */
  private buildSZSEUrl(baseUrl: string, params: Record<string, any>): string {
    const url = new URL(baseUrl)

    // 深交所API参数处理
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    return url.toString()
  }

  /**
   * 重写URL构建方法以适应深交所API
   */
  protected buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
    const fullPath = path ? `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : baseUrl
    return this.buildSZSEUrl(fullPath, params || {})
  }

  /**
   * 增加请求延迟以避免过于频繁的请求
   */
  protected async delayRequest(): Promise<void> {
    // 深交所API相对保守，增加基础延迟
    const baseDelay = 1000 // 1秒基础延迟
    const jitter = Math.random() * 500 // 随机抖动
    await this.sleep(baseDelay + jitter)
  }
}