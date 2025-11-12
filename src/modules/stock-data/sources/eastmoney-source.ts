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
 * 东方财富数据源实现
 * 提供东方财富API的数据获取功能
 */
export class EastMoneyDataSource extends BaseDataSource {
  // 东方财富API端点
  private readonly endpoints = {
    // 上交所股票数据
    sseData: 'http://push2.eastmoney.com/api/qt/clist/get',
    // 深交所股票数据
    szseData: 'http://9.push2.eastmoney.com/api/qt/clist/get',
    // 指数数据
    indexData: 'http://push2.eastmoney.com/api/qt/stock/get',
    // 个股详情数据
    stockDetail: 'http://push2.eastmoney.com/api/qt/stock/details/get',
    // 涨跌停数据
    limitData: 'http://push2.eastmoney.com/api/qt/clist/get',
    // 分时数据
    timeData: 'http://push2.eastmoney.com/api/qt/stock/trends2/get'
  }

  constructor(config?: Partial<DataSourceConfig>) {
    const defaultConfig: DataSourceConfig = {
      name: 'EastMoney',
      type: 'eastmoney',
      baseUrl: 'http://push2.eastmoney.com',
      enabled: true,
      priority: 1,
      requestConfig: {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'http://quote.eastmoney.com/'
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
        cb: `jQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

      const url = this.buildUrl(this.endpoints.sseData, '', params)
      const response = await this.fetchData(url, config)

      return this.parseStockDataResponse(response, date)
    })
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
        cb: `jQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      }

      const url = this.buildUrl(this.endpoints.szseData, '', params)
      const response = await this.fetchData(url, config)

      return this.parseStockDataResponse(response, date)
    })
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
        cb: `jQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fields: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152',
        secids: '1.000001,1.000002,1.000300,1.000905,1.000688,1.000016,0.399001,0.399005,0.399006'
      }

      const url = this.buildUrl(this.endpoints.indexData, '', params)
      const response = await this.fetchData(url, config)

      return this.parseIndexDataResponse(response, date)
    })
  }

  /**
   * 获取涨停数据
   */
  async getLimitUpData(date: string, config?: RequestConfig): Promise<ApiResponse<any>> {
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
        cb: `jQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

      const url = this.buildUrl(this.endpoints.limitData, '', params)
      const response = await this.fetchData(url, config)

      const stockDataResponse = this.parseStockDataResponse(response, date)

      // 过滤出涨停股票（涨幅 >= 9.9%）
      if (Array.isArray(stockDataResponse)) {
        const filteredData = stockDataResponse.filter((stock: any) =>
          stock.chg_rate >= 9.9
        )
        return {
          success: true,
          data: {
            fetchDate: new Date().toISOString(),
            exchange: 'LIMITUP',
            date: date,
            data: filteredData
          },
          message: `获取到${filteredData.length}只涨停股票`,
          status: 200,
          timestamp: Date.now()
        }
      }

      return {
        success: true,
        data: stockDataResponse,
        message: '获取涨停股票数据成功',
        status: 200,
        timestamp: Date.now()
      }
    })
  }

  /**
   * 获取跌停数据
   */
  async getLimitDownData(date: string, config?: RequestConfig): Promise<ApiResponse<any>> {
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
        cb: `jQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

      const url = this.buildUrl(this.endpoints.limitData, '', params)
      const response = await this.fetchData(url, config)

      const stockDataResponse = this.parseStockDataResponse(response, date)

      // 过滤出跌停股票（跌幅 <= -9.9%）
      if (Array.isArray(stockDataResponse)) {
        const filteredData = stockDataResponse.filter((stock: any) =>
          stock.chg_rate <= -9.9
        )
        return {
          success: true,
          data: {
            fetchDate: new Date().toISOString(),
            exchange: 'LIMITDOWN',
            date: date,
            data: filteredData
          },
          message: `获取到${filteredData.length}只跌停股票`,
          status: 200,
          timestamp: Date.now()
        }
      }

      return {
        success: true,
        data: stockDataResponse,
        message: '获取跌停股票数据成功',
        status: 200,
        timestamp: Date.now()
      }
    })
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 尝试获取一个简单的指数数据作为健康检查
      const response = await this.getIndexData(new Date().toISOString().split('T')[0])
      return response.success
    } catch (error) {
      return false
    }
  }

  /**
   * 获取数据
   */
  private async fetchData(url: string, config?: RequestConfig): Promise<any> {
    const headers = this.buildHeaders(config?.headers)

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(config?.timeout || this.config.requestConfig?.timeout || 10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    // 处理JSONP响应
    if (text.includes('jQuery')) {
      const jsonpMatch = text.match(/\((.*)\)/)
      if (jsonpMatch) {
        return JSON.parse(jsonpMatch[1])
      }
    }

    return JSON.parse(text)
  }

  /**
   * 解析股票数据响应
   */
  private parseStockDataResponse(response: any, date: string): StockDataResponse {
    if (!response || !response.data || !response.data.diff) {
      throw new Error('无效的响应数据格式')
    }

    const stocks: StockData[] = response.data.diff.map((item: any) => ({
      code: item.f12,
      name: item.f14,
      open: this.parseNumber(item.f17),
      high: this.parseNumber(item.f15),
      low: this.parseNumber(item.f16),
      last: this.parseNumber(item.f2),
      prev_close: this.parseNumber(item.f18),
      change: this.parseNumber(item.f4),
      chg_rate: this.parseNumber(item.f3),
      volume: this.parseNumber(item.f5),
      amount: this.parseNumber(item.f6),
      tradephase: item.f122 || '',
      amp_rate: this.parseNumber(item.f7),
      cpxxsubtype: this.parseString(item.f104),
      cpxxprodusta: this.parseString(item.f105)
    }))

    return {
      fetchDate: new Date().toISOString(),
      date,
      data: stocks
    }
  }

  /**
   * 解析指数数据响应
   */
  private parseIndexDataResponse(response: any, date: string): IndexDataResponse {
    if (!response || !response.data) {
      throw new Error('无效的响应数据格式')
    }

    const indices: IndexData[] = response.data.map((item: any) => ({
      code: item.f12,
      name: item.f14,
      current: this.parseNumber(item.f2),
      change: this.parseNumber(item.f4),
      chg_rate: this.parseNumber(item.f3),
      open: this.parseNumber(item.f17),
      high: this.parseNumber(item.f15),
      low: this.parseNumber(item.f16),
      volume: this.parseNumber(item.f5),
      amount: this.parseNumber(item.f6),
      prev_close: this.parseNumber(item.f18),
      update_time: this.parseString(item.f168) || new Date().toISOString()
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
    if (value === null || value === undefined || value === '-') {
      return 0
    }
    return parseFloat(value) || 0
  }

  /**
   * 解析字符串
   */
  private parseString(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }
    return String(value)
  }
}