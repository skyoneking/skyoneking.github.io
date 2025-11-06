/**
 * 请求管理器
 * 负责请求队列管理、并发控制、请求优先级等
 */

import { AntiCrawlingConfig } from '@/config/anti-crawling'

interface RequestTask {
  id: string
  execute: () => Promise<any>
  priority: number
  source: string
  createdAt: number
  resolve: (value: any) => void
  reject: (reason: any) => void
}

interface RequestMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastRequestTime: number
  queueLength: number
}

export class RequestManager {
  private queue: RequestTask[] = []
  private activeRequests = 0
  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: 0,
    queueLength: 0
  }
  private config: AntiCrawlingConfig
  private responseTimeHistory: number[] = []
  private burstRequestCount = 0
  private lastBurstReset = Date.now()

  constructor(config: AntiCrawlingConfig) {
    this.config = config
  }

  /**
   * 添加请求到队列
   */
  async addRequest<T>(
    executeFn: () => Promise<T>,
    source: string,
    priority: number = 1
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: RequestTask = {
        id: this.generateTaskId(),
        execute: executeFn,
        priority,
        source,
        createdAt: Date.now(),
        resolve: resolve as (value: any) => void,
        reject
      }

      this.queue.push(task)
      this.sortQueue()
      this.metrics.totalRequests++
      this.metrics.queueLength = this.queue.length

      // 立即尝试处理队列
      setTimeout(() => this.processQueue(), 0)
    })
  }

  /**
   * 处理队列中的请求
   */
  private async processQueue(): Promise<void> {
    // 检查并发限制
    if (this.activeRequests >= this.config.timing.maxConcurrentRequests) {
      return
    }

    // 检查队列是否为空
    if (this.queue.length === 0) {
      return
    }

    // 检查突发请求限制
    if (this.isBurstLimitReached()) {
      return
    }

    const task = this.queue.shift()!
    this.activeRequests++
    this.burstRequestCount++
    this.metrics.queueLength = this.queue.length

    try {
      // 计算随机延迟
      const delay = this.calculateDelay()
      if (delay > 0) {
        await this.delay(delay)
      }

      // 执行请求
      const startTime = Date.now()
      const result = await task.execute()
      const responseTime = Date.now() - startTime

      // 更新指标
      this.updateMetrics(responseTime, true)
      task.resolve(result)

    } catch (error) {
      this.updateMetrics(0, false)
      task.reject(error)
    } finally {
      this.activeRequests--
      // 继续处理下一个请求
      setTimeout(() => this.processQueue(), 0)
    }
  }

  /**
   * 计算请求延迟
   */
  private calculateDelay(): number {
    const { minDelay, maxDelay } = this.config.timing

    // 基础随机延迟
    const baseDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay

    // 考虑最后请求时间
    const timeSinceLastRequest = Date.now() - this.metrics.lastRequestTime
    const adjustedDelay = Math.max(0, baseDelay - timeSinceLastRequest)

    return adjustedDelay
  }

  /**
   * 检查是否达到突发请求限制
   */
  private isBurstLimitReached(): boolean {
    const { burstLimit, burstTimeWindow } = this.config.timing
    const now = Date.now()

    // 重置突发计数器
    if (now - this.lastBurstReset > burstTimeWindow) {
      this.burstRequestCount = 0
      this.lastBurstReset = now
      return false
    }

    return this.burstRequestCount >= burstLimit
  }

  /**
   * 根据优先级排序队列
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 首先按优先级排序（数字越小优先级越高）
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // 优先级相同时按创建时间排序（FIFO）
      return a.createdAt - b.createdAt
    })
  }

  /**
   * 更新请求指标
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    if (success) {
      this.metrics.successfulRequests++
      this.responseTimeHistory.push(responseTime)

      // 保持历史记录在合理范围内
      if (this.responseTimeHistory.length > 100) {
        this.responseTimeHistory.shift()
      }

      // 计算平均响应时间
      this.metrics.averageResponseTime =
        this.responseTimeHistory.reduce((sum, time) => sum + time, 0) /
        this.responseTimeHistory.length
    } else {
      this.metrics.failedRequests++
    }

    this.metrics.lastRequestTime = Date.now()
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取当前指标
   */
  getMetrics(): RequestMetrics {
    return {
      ...this.metrics,
      queueLength: this.queue.length,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0
    } as RequestMetrics & { successRate: number }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number
    activeRequests: number
    burstRequestCount: number
    nextRequestDelay: number
  } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      burstRequestCount: this.burstRequestCount,
      nextRequestDelay: this.calculateDelay()
    }
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 拒绝所有待处理的请求
    this.queue.forEach(task => {
      task.reject(new Error('Request queue cleared'))
    })
    this.queue.length = 0
    this.metrics.queueLength = 0
  }

  /**
   * 更新配置
   */
  updateConfig(config: AntiCrawlingConfig): void {
    this.config = config
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    // 停止接受新请求
    const activeRequests = this.activeRequests

    // 等待所有活动请求完成
    while (this.activeRequests > 0) {
      await this.delay(100)
    }

    // 清空队列
    this.clearQueue()

    console.log(`Request manager shutdown. Completed ${activeRequests} active requests.`)
  }
}

// 默认实例
let defaultManager: RequestManager | null = null

/**
 * 获取默认请求管理器实例
 */
export function getDefaultRequestManager(config?: AntiCrawlingConfig): RequestManager {
  if (!defaultManager) {
    if (!config) {
      throw new Error('Config is required for the first initialization')
    }
    defaultManager = new RequestManager(config)
  }
  return defaultManager
}

/**
 * 重置默认请求管理器
 */
export function resetDefaultRequestManager(): void {
  if (defaultManager) {
    defaultManager.shutdown()
    defaultManager = null
  }
}