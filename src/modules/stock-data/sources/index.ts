import { BaseDataSource } from './base-source'
import { EastMoneyDataSource } from './eastmoney-source'
import { SSEDataSource } from './sse-source'
import { SZSEDataSource } from './szse-source'
import { DataSourceConfig, DataSourceHealth, DataSourceType } from '../types'

/**
 * 数据源管理器
 * 负责管理多个数据源，并提供统一的数据获取接口
 */
export class DataSourceManager {
  private dataSources: Map<string, BaseDataSource> = new Map()
  private primarySource: BaseDataSource | null = null
  private fallbackSources: BaseDataSource[] = []

  constructor() {
    this.initializeDefaultSources()
  }

  /**
   * 初始化默认数据源
   */
  private initializeDefaultSources(): void {
    // 注册东方财富数据源
    const eastMoneySource = new EastMoneyDataSource()
    this.registerDataSource(eastMoneySource)

    // 注册上交所数据源
    const sseSource = new SSEDataSource()
    this.registerDataSource(sseSource)

    // 注册深交所数据源
    const szseSource = new SZSEDataSource()
    this.registerDataSource(szseSource)

    // 设置默认主要数据源和备用数据源
    this.setPrimarySource(DataSourceType.EASTMONEY)
    this.setFallbackSources([DataSourceType.SSE, DataSourceType.SZSE])
  }

  /**
   * 注册数据源
   */
  registerDataSource(dataSource: BaseDataSource): void {
    this.dataSources.set(dataSource.type, dataSource)
  }

  /**
   * 注销数据源
   */
  unregisterDataSource(type: string): void {
    this.dataSources.delete(type)

    // 如果注销的是主要数据源，需要重新选择
    if (this.primarySource?.type === type) {
      this.primarySource = null
    }

    // 从备用数据源中移除
    this.fallbackSources = this.fallbackSources.filter(source => source.type !== type)
  }

  /**
   * 设置主要数据源
   */
  setPrimarySource(type: DataSourceType): void {
    const source = this.dataSources.get(type)
    if (source && source.isHealthy) {
      this.primarySource = source
    } else {
      throw new Error(`数据源 ${type} 不存在或不可用`)
    }
  }

  /**
   * 设置备用数据源
   */
  setFallbackSources(types: DataSourceType[]): void {
    this.fallbackSources = []
    for (const type of types) {
      const source = this.dataSources.get(type)
      if (source && source.isHealthy) {
        this.fallbackSources.push(source)
      }
    }
  }

  /**
   * 获取数据源
   */
  getDataSource(type: DataSourceType): BaseDataSource | undefined {
    return this.dataSources.get(type)
  }

  /**
   * 获取所有数据源
   */
  getAllDataSources(): BaseDataSource[] {
    return Array.from(this.dataSources.values())
  }

  /**
   * 获取健康的数据源
   */
  getHealthyDataSources(): BaseDataSource[] {
    return Array.from(this.dataSources.values()).filter(source => source.isHealthy)
  }

  /**
   * 获取主要数据源
   */
  getPrimaryDataSource(): BaseDataSource | null {
    return this.primarySource
  }

  /**
   * 获取备用数据源
   */
  getFallbackDataSources(): BaseDataSource[] {
    return this.fallbackSources
  }

  /**
   * 自动选择最佳数据源
   */
  selectBestDataSource(): BaseDataSource | null {
    const healthySources = this.getHealthyDataSources()
    if (healthySources.length === 0) {
      return null
    }

    // 优先返回主要数据源
    if (this.primarySource && this.primarySource.isHealthy) {
      return this.primarySource
    }

    // 按优先级排序，返回第一个健康的
    const sortedSources = healthySources.sort((a, b) => {
      const aConfig = a.configuration
      const bConfig = b.configuration
      return (aConfig.priority || 999) - (bConfig.priority || 999)
    })

    return sortedSources[0] || null
  }

  /**
   * 获取数据源健康状态
   */
  getDataSourceHealth(): DataSourceHealth[] {
    return Array.from(this.dataSources.values()).map(source => source.getStats())
  }

  /**
   * 检查所有数据源健康状态
   */
  async checkAllDataSourcesHealth(): Promise<void> {
    const healthCheckPromises = Array.from(this.dataSources.values()).map(async source => {
      try {
        const isHealthy = await source.healthCheck()
        return { source: source.type, isHealthy }
      } catch (error) {
        return { source: source.type, isHealthy: false, error }
      }
    })

    const results = await Promise.all(healthCheckPromises)

    // 如果主要数据源不健康，尝试重新选择
    const primaryResult = results.find(r => r.source === this.primarySource?.type)
    if (primaryResult && !primaryResult.isHealthy) {
      console.warn(`主要数据源 ${this.primarySource?.name} 健康检查失败，尝试重新选择`)
      const newPrimary = this.selectBestDataSource()
      if (newPrimary) {
        this.primarySource = newPrimary
        console.info(`切换到主要数据源: ${newPrimary.name}`)
      }
    }

    // 更新备用数据源列表
    this.fallbackSources = this.fallbackSources.filter(source => {
      const result = results.find(r => r.source === source.type)
      return result?.isHealthy !== false
    })
  }

  /**
   * 启用/禁用数据源
   */
  setDataSourceEnabled(type: DataSourceType, enabled: boolean): void {
    const source = this.dataSources.get(type)
    if (source) {
      source.configuration.enabled = enabled

      if (!enabled) {
        // 如果禁用的是主要数据源，需要重新选择
        if (this.primarySource?.type === type) {
          const newPrimary = this.selectBestDataSource()
          if (newPrimary) {
            this.primarySource = newPrimary
          }
        }

        // 从备用数据源中移除
        this.fallbackSources = this.fallbackSources.filter(s => s.type !== type)
      } else {
        // 如果启用，重新添加到备用数据源（如果还不是主要数据源）
        if (this.primarySource?.type !== type) {
          if (!this.fallbackSources.some(s => s.type === type)) {
            this.fallbackSources.push(source)
          }
        }
      }
    }
  }

  /**
   * 配置数据源
   */
  configureDataSource(type: DataSourceType, config: Partial<DataSourceConfig>): void {
    const source = this.dataSources.get(type)
    if (source) {
      Object.assign(source.configuration, config)
    }
  }

  /**
   * 重置所有数据源统计
   */
  resetAllStats(): void {
    this.dataSources.forEach(source => source.resetStats())
  }

  /**
   * 获取数据源统计摘要
   */
  getStatsSummary() {
    const sources = Array.from(this.dataSources.values())
    const totalRequests = sources.reduce((sum, source) =>
      sum + source.getStats().totalRequests, 0
    )
    const successfulRequests = sources.reduce((sum, source) => {
      const stats = source.getStats()
      const successfulCount = stats.totalRequests - stats.errorCount
      return sum + successfulCount
    }, 0)
    const failedRequests = sources.reduce((sum, source) =>
      sum + source.getStats().errorCount, 0
    )
    const averageResponseTime = sources.reduce((sum, source) =>
      sum + source.getStats().averageResponseTime, 0
    ) / sources.length

    return {
      totalDataSources: sources.length,
      healthyDataSources: sources.filter(s => s.isHealthy).length,
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageResponseTime,
      primarySource: this.primarySource?.name || 'none',
      fallbackSourcesCount: this.fallbackSources.length
    }
  }
}

// 导出数据源类
export { BaseDataSource, EastMoneyDataSource, SSEDataSource, SZSEDataSource }

// 导出数据源管理器实例
export const dataSourceManager = new DataSourceManager()