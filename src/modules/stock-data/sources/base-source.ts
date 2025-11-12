import {
  DataSourceConfig,
  ApiResponse,
  StockDataResponse,
  IndexDataResponse,
  ErrorType,
  RequestConfig
} from '../types'

/**
 * 数据源基础抽象类
 * 定义所有数据源必须实现的接口和通用功能
 */
export abstract class BaseDataSource {
  /** 数据源配置 */
  protected config: DataSourceConfig
  /** 请求统计 */
  protected stats: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    lastRequestTime: number
  }
  /** 健康状态 */
  protected health: {
    isHealthy: boolean
    lastCheckTime: number
    consecutiveFailures: number
    lastError?: string
  }

  constructor(config: DataSourceConfig) {
    this.config = config
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0
    }
    this.health = {
      isHealthy: true,
      lastCheckTime: Date.now(),
      consecutiveFailures: 0
    }
  }

  /**
   * 获取数据源名称
   */
  get name(): string {
    return this.config.name
  }

  /**
   * 获取数据源类型
   */
  get type(): string {
    return this.config.type
  }

  /**
   * 获取数据源配置
   */
  get configuration(): DataSourceConfig {
    return { ...this.config }
  }

  /**
   * 检查数据源是否健康
   */
  get isHealthy(): boolean {
    return this.health.isHealthy && this.config.enabled
  }

  /**
   * 获取请求统计
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
      : 0

    return {
      name: this.config.name,
      isHealthy: this.health.isHealthy,
      lastCheckTime: new Date(this.health.lastCheckTime).toISOString(),
      successRate,
      averageResponseTime: this.stats.averageResponseTime,
      errorCount: this.stats.failedRequests,
      totalRequests: this.stats.totalRequests,
      lastError: this.health.lastError
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0
    }
  }

  /**
   * 抽象方法：获取上交所数据
   */
  abstract getSSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>>

  /**
   * 抽象方法：获取深交所数据
   */
  abstract getSZSEData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>>

  /**
   * 抽象方法：获取指数数据
   */
  abstract getIndexData(date: string, config?: RequestConfig): Promise<ApiResponse<IndexDataResponse>>

  /**
   * 抽象方法：获取涨停数据
   */
  abstract getLimitUpData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>>

  /**
   * 抽象方法：获取跌停数据
   */
  abstract getLimitDownData(date: string, config?: RequestConfig): Promise<ApiResponse<StockDataResponse>>

  /**
   * 抽象方法：健康检查
   */
  abstract healthCheck(): Promise<boolean>

  /**
   * 通用的请求处理方法
   */
  protected async handleRequest<T>(
    requestFn: () => Promise<T>,
    errorType: ErrorType = ErrorType.UNKNOWN_ERROR
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now()
    this.stats.totalRequests++
    this.stats.lastRequestTime = startTime

    try {
      const result = await requestFn()
      const endTime = Date.now()
      const responseTime = endTime - startTime

      // 更新统计信息
      this.stats.successfulRequests++
      this.updateAverageResponseTime(responseTime)
      this.updateHealthStatus(true)

      return {
        success: true,
        data: result,
        message: '数据获取成功',
        status: 200,
        timestamp: Date.now()
      }
    } catch (error: any) {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      // 更新统计信息
      this.stats.failedRequests++
      this.updateAverageResponseTime(responseTime)
      this.updateHealthStatus(false, error.message)

      // 分类错误类型
      const classifiedErrorType = this.classifyError(error, errorType)

      return {
        success: false,
        data: null as any,
        message: error.message || '数据获取失败',
        status: error.status || 500,
        errorType: classifiedErrorType,
        originalError: error.stack || error.message,
        timestamp: Date.now()
      }
    }
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime
    } else {
      // 使用指数移动平均
      const alpha = 0.1 // 平滑因子
      this.stats.averageResponseTime =
        alpha * responseTime + (1 - alpha) * this.stats.averageResponseTime
    }
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(success: boolean, error?: string): void {
    this.health.lastCheckTime = Date.now()

    if (success) {
      this.health.consecutiveFailures = 0
      this.health.lastError = undefined
      this.health.isHealthy = true
    } else {
      this.health.consecutiveFailures++
      this.health.lastError = error

      // 连续失败3次以上认为不健康
      if (this.health.consecutiveFailures >= 3) {
        this.health.isHealthy = false
      }
    }
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any, defaultType: ErrorType): ErrorType {
    if (!error) return defaultType

    const message = error.message?.toLowerCase() || ''
    const status = error.status || error.response?.status

    // 根据状态码分类
    if (status) {
      if (status === 429) return ErrorType.RATE_LIMIT
      if (status === 401 || status === 403) return ErrorType.AUTHENTICATION_ERROR
      if (status === 404) return ErrorType.NOT_FOUND
      if (status >= 500) return ErrorType.SERVER_ERROR
      if (status >= 400) return ErrorType.FORBIDDEN
    }

    // 根据错误消息分类
    if (message.includes('timeout')) return ErrorType.TIMEOUT
    if (message.includes('network') || message.includes('fetch')) return ErrorType.NETWORK_ERROR
    if (message.includes('rate limit') || message.includes('too many requests')) return ErrorType.RATE_LIMIT
    if (message.includes('unauthorized') || message.includes('forbidden')) return ErrorType.AUTHENTICATION_ERROR

    return defaultType
  }

  /**
   * 构建请求URL
   */
  protected buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
    const url = new URL(path, baseUrl)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  /**
   * 构建请求头
   */
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...this.config.requestConfig?.headers,
      ...additionalHeaders
    }

    return headers
  }

  /**
   * 验证日期格式
   */
  protected validateDate(date: string): boolean {
    // 支持 YYYY-MM-DD 格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    return dateRegex.test(date) && !isNaN(Date.parse(date))
  }

  /**
   * 获取随机延迟
   */
  protected getRandomDelay(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  /**
   * 休眠指定时间
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}