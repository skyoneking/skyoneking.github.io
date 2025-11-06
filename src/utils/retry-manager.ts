/**
 * 智能重试管理器
 * 负责错误分类、指数退避重试、数据源切换等
 */

import { AntiCrawlingConfig } from '@/config/anti-crawling'

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION_ERROR = 'authentication_error',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface RetryContext {
  attempt: number
  maxAttempts: number
  error: Error
  errorType: ErrorType
  delay: number
  source: string
}

export type RetryStrategy = {
  shouldRetry: (context: RetryContext) => boolean
  getDelay: (context: RetryContext) => number
  onFailure?: (context: RetryContext) => void
  onSuccess?: (source: string) => void
}

export class RetryManager {
  private config: AntiCrawlingConfig
  private sourceRetryCount: Map<string, number> = new Map()
  private sourceFailureCount: Map<string, number> = new Map()
  private lastRetryTime: Map<string, number> = new Map()

  constructor(config: AntiCrawlingConfig) {
    this.config = config
  }

  /**
   * 执行带重试的请求
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    source: string,
    customStrategy?: Partial<RetryStrategy>
  ): Promise<T> {
    const strategy = this.mergeWithDefaultStrategy(customStrategy)
    const context = {
      attempt: 0,
      maxAttempts: this.config.retry.maxRetries + 1,
      error: new Error(),
      errorType: ErrorType.UNKNOWN_ERROR,
      delay: 0,
      source
    }

    while (context.attempt < context.maxAttempts) {
      try {
        const result = await fn()
        this.onSuccess(source)
        return result
      } catch (error) {
        context.error = error as Error
        context.errorType = this.classifyError(error as Error)
        context.attempt++

        // 检查是否应该重试
        if (!strategy.shouldRetry(context)) {
          this.onFailure(context)
          throw error
        }

        // 计算延迟时间
        context.delay = strategy.getDelay(context)

        // 记录失败
        this.recordFailure(source, context.errorType)

        // 等待后重试
        if (context.attempt < context.maxAttempts) {
          await this.delay(context.delay)
        }
      }
    }

    // 达到最大重试次数，抛出最后的错误
    this.onFailure(context)
    throw context.error
  }

  /**
   * 合并默认策略
   */
  private mergeWithDefaultStrategy(custom?: Partial<RetryStrategy>): RetryStrategy {
    const defaultStrategy: RetryStrategy = {
      shouldRetry: (context) => this.shouldRetryDefault(context),
      getDelay: (context) => this.calculateDelayDefault(context),
      onFailure: (context) => this.onFailure(context),
      onSuccess: (source) => this.onSuccess(source)
    }

    return { ...defaultStrategy, ...custom }
  }

  /**
   * 默认重试判断逻辑
   */
  private shouldRetryDefault(context: RetryContext): boolean {
    const { attempt, maxAttempts, errorType } = context

    // 达到最大重试次数
    if (attempt >= maxAttempts) {
      return false
    }

    // 非重试状态码
    if (errorType === ErrorType.AUTHENTICATION_ERROR ||
        errorType === ErrorType.FORBIDDEN ||
        errorType === ErrorType.NOT_FOUND) {
      return false
    }

    // 网络错误和服务器错误可以重试
    return [ErrorType.NETWORK_ERROR, ErrorType.RATE_LIMIT, ErrorType.SERVER_ERROR, ErrorType.TIMEOUT].includes(errorType)
  }

  /**
   * 默认延迟计算（指数退避 + 随机抖动）
   */
  private calculateDelayDefault(context: RetryContext): number {
    const { attempt, errorType } = context
    const { baseDelay, maxDelay, backoffMultiplier, jitter } = this.config.retry

    // 指数退避
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)

    // 限流错误使用更长的延迟
    if (errorType === ErrorType.RATE_LIMIT) {
      delay *= 2
    }

    // 限制最大延迟
    delay = Math.min(delay, maxDelay)

    // 添加随机抖动
    if (jitter) {
      const jitterAmount = delay * 0.1 // 10% 抖动
      delay += (Math.random() - 0.5) * jitterAmount
    }

    // 确保最小延迟
    delay = Math.max(delay, 100)

    return Math.floor(delay)
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()

    // 网络错误
    if (this.config.retry.retryableErrors.some(code => message.includes(code.toLowerCase()))) {
      return ErrorType.NETWORK_ERROR
    }

    // 超时错误
    if (message.includes('timeout') || message.includes('etimedout')) {
      return ErrorType.TIMEOUT
    }

    // 状态码错误（如果error包含状态码信息）
    const statusCodeMatch = message.match(/status\s*code\s*:?\s*(\d{3})/i)
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1])
      return this.classifyStatusCode(statusCode)
    }

    // 限流错误
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT
    }

    // 认证错误
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorType.AUTHENTICATION_ERROR
    }

    // 禁止访问
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorType.FORBIDDEN
    }

    // 服务器错误
    if (message.includes('server error') || message.includes('internal server error')) {
      return ErrorType.SERVER_ERROR
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * 根据状态码分类错误
   */
  private classifyStatusCode(statusCode: number): ErrorType {
    if (this.config.retry.retryableStatusCodes.includes(statusCode)) {
      if (statusCode === 429) return ErrorType.RATE_LIMIT
      if (statusCode >= 500) return ErrorType.SERVER_ERROR
      return ErrorType.NETWORK_ERROR
    }

    if (this.config.retry.nonRetryableStatusCodes.includes(statusCode)) {
      switch (statusCode) {
        case 401: return ErrorType.AUTHENTICATION_ERROR
        case 403: return ErrorType.FORBIDDEN
        case 404: return ErrorType.NOT_FOUND
        default: return ErrorType.UNKNOWN_ERROR
      }
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * 记录失败
   */
  private recordFailure(source: string, errorType: ErrorType): void {
    const currentCount = this.sourceFailureCount.get(source) || 0
    this.sourceFailureCount.set(source, currentCount + 1)
    this.lastRetryTime.set(source, Date.now())
  }

  /**
   * 成功回调
   */
  private onSuccess(source: string): void {
    // 重置失败计数
    this.sourceFailureCount.delete(source)
    this.sourceRetryCount.set(source, this.sourceRetryCount.get(source) || 0 + 1)
  }

  /**
   * 失败回调
   */
  private onFailure(context: RetryContext): void {
    const { source, errorType, attempt } = context
    console.warn(`Request failed after ${attempt} attempts for ${source}:`, errorType, context.error.message)
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取数据源健康状态
   */
  getSourceHealth(source: string): {
    successRate: number
    failureCount: number
    retryCount: number
    lastRetryTime: number
    status: 'healthy' | 'degraded' | 'unhealthy'
  } {
    const failureCount = this.sourceFailureCount.get(source) || 0
    const retryCount = this.sourceRetryCount.get(source) || 0
    const lastRetryTime = this.lastRetryTime.get(source) || 0

    const totalAttempts = failureCount + retryCount
    const successRate = totalAttempts > 0 ? retryCount / totalAttempts : 1

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (successRate < this.config.monitoring.alertThreshold) {
      status = 'unhealthy'
    } else if (successRate < this.config.monitoring.successRateThreshold) {
      status = 'degraded'
    }

    return {
      successRate,
      failureCount,
      retryCount,
      lastRetryTime,
      status
    }
  }

  /**
   * 获取所有数据源健康状态
   */
  getAllSourcesHealth(): Record<string, ReturnType<typeof this.getSourceHealth>> {
    const sources = new Set([
      ...this.sourceFailureCount.keys(),
      ...this.sourceRetryCount.keys(),
      ...this.config.dataSources ? Object.keys(this.config.dataSources) : []
    ])

    const health: Record<string, ReturnType<typeof this.getSourceHealth>> = {}
    sources.forEach(source => {
      health[source] = this.getSourceHealth(source)
    })

    return health
  }

  /**
   * 重置数据源统计
   */
  resetSourceStats(source?: string): void {
    if (source) {
      this.sourceFailureCount.delete(source)
      this.sourceRetryCount.delete(source)
      this.lastRetryTime.delete(source)
    } else {
      this.sourceFailureCount.clear()
      this.sourceRetryCount.clear()
      this.lastRetryTime.clear()
    }
  }

  /**
   * 获取重试统计信息
   */
  getRetryStats(): {
    totalFailures: number
    totalRetries: number
    sourcesWithFailures: number
    averageFailureRate: number
  } {
    const allSources = new Set([
      ...this.sourceFailureCount.keys(),
      ...this.sourceRetryCount.keys()
    ])

    let totalFailures = 0
    let totalRetries = 0

    allSources.forEach(source => {
      totalFailures += this.sourceFailureCount.get(source) || 0
      totalRetries += this.sourceRetryCount.get(source) || 0
    })

    const totalAttempts = totalFailures + totalRetries
    const averageFailureRate = totalAttempts > 0 ? totalFailures / totalAttempts : 0

    return {
      totalFailures,
      totalRetries,
      sourcesWithFailures: allSources.size,
      averageFailureRate
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: AntiCrawlingConfig): void {
    this.config = config
  }
}

// 默认实例
let defaultRetryManager: RetryManager | null = null

/**
 * 获取默认重试管理器实例
 */
export function getDefaultRetryManager(config?: AntiCrawlingConfig): RetryManager {
  if (!defaultRetryManager) {
    if (!config) {
      throw new Error('Config is required for the first initialization')
    }
    defaultRetryManager = new RetryManager(config)
  }
  return defaultRetryManager
}

/**
 * 重置默认重试管理器
 */
export function resetDefaultRetryManager(): void {
  defaultRetryManager = null
}