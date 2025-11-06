/**
 * 反爬虫配置类型定义
 */

export interface AntiCrawlingConfig {
  timing: {
    minDelay: number
    maxDelay: number
    maxConcurrentRequests: number
    burstLimit: number
    burstTimeWindow: number
    pageDwellTime: {
      min: number
      max: number
    }
  }
  userAgents: string[]
  headers: {
    common: Record<string, string>
    eastmoney: Record<string, string>
    sse: Record<string, string>
  }
  retry: {
    maxRetries: number
    baseDelay: number
    maxDelay: number
    backoffMultiplier: number
    jitter: boolean
    retryableErrors: string[]
    retryableStatusCodes: number[]
    nonRetryableStatusCodes: number[]
  }
  monitoring: {
    enabled: boolean
    successRateThreshold: number
    alertThreshold: number
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    metricsWindow: number
    maxLogEntries: number
  }
  dataSources: {
    sse: {
      priority: number
      timeout: number
      baseUrl: string
      enabled: boolean
    }
    szse: {
      priority: number
      timeout: number
      baseUrl: string
      enabled: boolean
      pagination: {
        pageSize: number
        maxPages: number
        pageDelay: boolean
      }
    }
    indices: {
      priority: number
      timeout: number
      enabled: boolean
      mockData: boolean
    }
  }
  environments: {
    development: Partial<AntiCrawlingConfig>
    production: Partial<AntiCrawlingConfig>
  }
}