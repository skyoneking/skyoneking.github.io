import { ApiService } from './api-service'
import { CacheService } from './cache-service'
import { dataSourceManager } from '../sources'
import {
  ApiResponse,
  StockDataResponse,
  IndexDataResponse,
  GetDataOptions,
  BatchGetDataOptions,
  DataType,
  DataSourceType,
  ErrorType,
  RequestStats,
  CacheStats,
  DataSourceHealth,
  StockData
} from '../types'

/**
 * 股票数据服务
 * 提供统一的股票数据获取接口，支持多数据源、缓存、重试等功能
 */
export class StockDataService {
  private apiService: ApiService
  private cacheService: CacheService
  private requestStats: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    requestsBySource: Record<string, { count: number; successCount: number; averageTime: number }>
    lastRequestTime: number
  }

  constructor(config?: {
    apiService?: ApiService
    cacheService?: CacheService
  }) {
    this.apiService = config?.apiService || new ApiService()
    this.cacheService = config?.cacheService || new CacheService()
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestsBySource: {},
      lastRequestTime: 0
    }

    this.setupInterceptors()
  }

  /**
   * 获取上交所数据
   */
  async getSSEData(date: string, options?: GetDataOptions): Promise<ApiResponse<StockDataResponse>> {
    return this.getData(DataType.SSE, date, options)
  }

  /**
   * 获取深交所数据
   */
  async getSZSEData(date: string, options?: GetDataOptions): Promise<ApiResponse<StockDataResponse>> {
    return this.getData(DataType.SZSE, date, options)
  }

  /**
   * 获取指数数据
   */
  async getIndexData(date: string, options?: GetDataOptions): Promise<ApiResponse<IndexDataResponse>> {
    return this.getData(DataType.INDICES, date, options)
  }

  /**
   * 获取涨停数据
   */
  async getLimitUpData(date: string, options?: GetDataOptions): Promise<ApiResponse<StockDataResponse>> {
    return this.getData(DataType.LIMIT_UP, date, options)
  }

  /**
   * 获取跌停数据
   */
  async getLimitDownData(date: string, options?: GetDataOptions): Promise<ApiResponse<StockDataResponse>> {
    return this.getData(DataType.LIMIT_DOWN, date, options)
  }

  /**
   * 批量获取数据
   */
  async batchGetData(
    requests: Array<{ type: DataType; date: string }>,
    options?: BatchGetDataOptions
  ): Promise<ApiResponse<any>[]> {
    const concurrency = options?.concurrency || 3
    const results: ApiResponse<any>[] = []

    // 分批处理请求
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await this.getData(request.type, request.date, {
            useCache: options?.useCache,
            forceRefresh: options?.forceRefresh,
            timeout: options?.timeout,
            retry: options?.retry !== false
          })

          // 调用进度回调
          if (options?.onProgress) {
            options.onProgress(i + index + 1, requests.length)
          }

          return result
        } catch (error: any) {
          if (options?.continueOnError) {
            return {
              success: false,
              data: null as any,
              message: error.message || '请求失败',
              status: 500,
              errorType: ErrorType.UNKNOWN_ERROR
            }
          }
          throw error
        }
      })

      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...(batchResults as any))
      } catch (error) {
        if (!options?.continueOnError) {
          throw error
        }
      }
    }

    return results
  }

  /**
   * 通用数据获取方法
   */
  private async getData<T>(
    type: DataType,
    date: string,
    options?: GetDataOptions
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now()
    this.requestStats.totalRequests++
    this.requestStats.lastRequestTime = startTime

    try {
      // 检查缓存
      if (!options?.forceRefresh && options?.useCache !== false) {
        const cacheKey = `${type}_${date}_${JSON.stringify(options || {})}`
        const cachedData = await this.cacheService.get<T>(cacheKey)

        if (cachedData) {
          this.requestStats.successfulRequests++
          return {
            success: true,
            data: cachedData,
            message: '缓存数据',
            status: 200,
            timestamp: Date.now()
          }
        }
      }

      // 选择数据源
      const dataSource = options?.dataSource
        ? dataSourceManager.getDataSource(options.dataSource)
        : dataSourceManager.selectBestDataSource()

      if (!dataSource) {
        throw new Error('没有可用的数据源')
      }

      // 执行数据获取
      let response: ApiResponse<T>

      switch (type) {
        case DataType.SSE:
          response = await dataSource.getSSEData(date, {
            timeout: options?.timeout
          }) as ApiResponse<T>
          break
        case DataType.SZSE:
          response = await dataSource.getSZSEData(date, {
            timeout: options?.timeout
          }) as ApiResponse<T>
          break
        case DataType.INDICES:
          response = await dataSource.getIndexData(date, {
            timeout: options?.timeout
          }) as ApiResponse<T>
          break
        case DataType.LIMIT_UP:
          response = await dataSource.getLimitUpData(date, {
            timeout: options?.timeout
          }) as ApiResponse<T>
          break
        case DataType.LIMIT_DOWN:
          response = await dataSource.getLimitDownData(date, {
            timeout: options?.timeout
          }) as ApiResponse<T>
          break
        default:
          throw new Error(`不支持的数据类型: ${type}`)
      }

      // 更新统计信息
      this.updateRequestStats(dataSource.name, response.success, Date.now() - startTime)

      // 缓存成功响应
      if (response.success && response.data) {
        const cacheKey = `${type}_${date}_${JSON.stringify(options || {})}`
        await this.cacheService.set(cacheKey, response.data, 30 * 60 * 1000) // 30分钟缓存
      }

      return response
    } catch (error: any) {
      this.requestStats.failedRequests++
      this.updateRequestStats('unknown', false, Date.now() - startTime)

      return {
        success: false,
        data: null as any,
        message: error.message || '数据获取失败',
        status: 500,
        errorType: this.classifyError(error),
        originalError: error.stack || error.message,
        timestamp: Date.now()
      }
    }
  }

  /**
   * 订阅数据变化
   */
  subscribe(type: DataType, date: string, options: {
    interval: number
    autoReconnect: boolean
    reconnectInterval: number
    onDataChange: (data: any) => void
    onError: (error: Error) => void
  }): () => void {
    let intervalId: number | null = null
    let isActive = true

    const fetchData = async () => {
      if (!isActive) return

      try {
        const response = await this.getData(type, date, { useCache: false })
        if (response.success && response.data) {
          options.onDataChange(response.data)
        }
      } catch (error) {
        options.onError(error as Error)

        if (options.autoReconnect && isActive) {
          setTimeout(() => {
            if (isActive) {
              fetchData()
            }
          }, options.reconnectInterval)
        }
      }
    }

    // 立即获取一次数据
    fetchData()

    // 设置定时器
    intervalId = window.setInterval(fetchData, options.interval)

    // 返回取消订阅函数
    return () => {
      isActive = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }

  /**
   * 获取数据源健康状态
   */
  getDataSourceHealth(): DataSourceHealth[] {
    return dataSourceManager.getDataSourceHealth()
  }

  /**
   * 获取请求统计
   */
  getRequestStats(): RequestStats {
    const successRate = this.requestStats.totalRequests > 0
      ? (this.requestStats.successfulRequests / this.requestStats.totalRequests) * 100
      : 0

    const averageResponseTime = Object.values(this.requestStats.requestsBySource)
      .reduce((sum, stats) => sum + stats.averageTime, 0) /
      Math.max(1, Object.keys(this.requestStats.requestsBySource).length)

    return {
      totalRequests: this.requestStats.totalRequests,
      successfulRequests: this.requestStats.successfulRequests,
      failedRequests: this.requestStats.failedRequests,
      averageResponseTime,
      successRate,
      requestsBySource: this.requestStats.requestsBySource
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<CacheStats> {
    return this.cacheService.getStats()
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      // 清除匹配模式的缓存
      // 这里简化处理，实际可以实现更复杂的模式匹配
      this.cacheService.clear()
    } else {
      await this.cacheService.clear()
    }
  }

  /**
   * 配置数据源
   */
  configureDataSource(type: DataSourceType, config: {
    enabled?: boolean
    priority?: number
    requestConfig?: any
  }): void {
    dataSourceManager.configureDataSource(type, config)

    if (config.enabled !== undefined) {
      dataSourceManager.setDataSourceEnabled(type, config.enabled)
    }
  }

  /**
   * 设置主要数据源
   */
  setPrimaryDataSource(type: DataSourceType): void {
    dataSourceManager.setPrimarySource(type)
  }

  /**
   * 设置备用数据源
   */
  setFallbackDataSources(types: DataSourceType[]): void {
    dataSourceManager.setFallbackSources(types)
  }

  /**
   * 检查数据源健康状态
   */
  async checkDataSourcesHealth(): Promise<void> {
    await dataSourceManager.checkAllDataSourcesHealth()
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.requestStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestsBySource: {},
      lastRequestTime: 0
    }
    dataSourceManager.resetAllStats()
  }

  /**
   * 设置请求拦截器
   */
  setRequestInterceptor(interceptor: (config: any) => any): void {
    this.apiService.addRequestInterceptor(interceptor)
  }

  /**
   * 设置响应拦截器
   */
  setResponseInterceptor(interceptor: (response: any) => any): void {
    this.apiService.addResponseInterceptor(interceptor)
  }

  /**
   * 设置错误拦截器
   */
  setErrorInterceptor(interceptor: (error: any) => any): void {
    this.apiService.addErrorInterceptor(interceptor)
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器 - 添加通用请求头
    this.apiService.addRequestInterceptor((config) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          'X-Requested-With': 'StockDataService',
          'X-Request-Time': Date.now().toString()
        }
      }
    })

    // 响应拦截器 - 记录响应时间
    this.apiService.addResponseInterceptor((response) => {
      // 可以在这里添加响应处理逻辑
      return response
    })

    // 错误拦截器 - 统一错误处理
    this.apiService.addErrorInterceptor((error) => {
      // 可以在这里添加错误处理逻辑
      console.error('API Error:', error)
      return error
    })
  }

  /**
   * 更新请求统计
   */
  private updateRequestStats(source: string, success: boolean, responseTime: number): void {
    if (!this.requestStats.requestsBySource[source]) {
      this.requestStats.requestsBySource[source] = {
        count: 0,
        successCount: 0,
        averageTime: 0
      }
    }

    const stats = this.requestStats.requestsBySource[source]
    stats.count++

    if (success) {
      stats.successCount++
    }

    // 更新平均响应时间
    if (stats.count === 1) {
      stats.averageTime = responseTime
    } else {
      const alpha = 0.1 // 平滑因子
      stats.averageTime = alpha * responseTime + (1 - alpha) * stats.averageTime
    }
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN_ERROR

    const message = error.message?.toLowerCase() || ''

    if (message.includes('timeout') || message.includes('aborted')) {
      return ErrorType.TIMEOUT
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorType.AUTHENTICATION_ERROR
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * 获取股票数据（按类型）
   */
  async getStockData(options: { exchange: string; date?: string }): Promise<StockData[]> {
    const date = options.date || new Date().toISOString().split('T')[0]
    let dataType: DataType

    switch (options.exchange.toUpperCase()) {
      case 'SSE':
        dataType = DataType.SSE
        break
      case 'SZSE':
        dataType = DataType.SZSE
        break
      default:
        // 获取所有数据
        const [sseData, szseData] = await Promise.all([
          this.getSSEData(date),
          this.getSZSEData(date)
        ])

        const stocks: StockData[] = []
        if (sseData.success && sseData.data) {
          stocks.push(...sseData.data.data)
        }
        if (szseData.success && szseData.data) {
          stocks.push(...szseData.data.data)
        }
        return stocks
    }

    const response = await this.getData(dataType, date)
    return response.success ? (response.data as any).data || [] : []
  }

  /**
   * 获取市场统计数据
   */
  async getMarketStats(options?: GetDataOptions): Promise<any> {
    // 这里可以根据实际需求实现市场统计功能
    return {
      totalStocks: 0,
      limitUpStocks: 0,
      limitDownStocks: 0,
      upStocks: 0,
      downStocks: 0,
      flatStocks: 0,
      timestamp: Date.now()
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): any {
    return {
      sources: [],
      cache: this.getCacheStats(),
      statistics: this.getRequestStats()
    }
  }

  
  
  /**
   * 销毁服务
   */
  destroy(): void {
    this.resetStats()
    // 清理其他资源
  }
}