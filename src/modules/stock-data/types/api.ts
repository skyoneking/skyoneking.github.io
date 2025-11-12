import { StockData, IndexData, ErrorType } from './stock'

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data: T
  /** 错误信息 */
  message?: string
  /** 错误码 */
  code?: string
  /** HTTP状态码 */
  status?: number
  /** 错误类型 */
  errorType?: any
  /** 原始错误 */
  originalError?: any
  /** 响应时间 */
  timestamp: number
}

/**
 * HTTP请求配置接口
 */
export interface RequestConfig {
  /** 请求超时时间(毫秒) */
  timeout?: number
  /** 请求头 */
  headers?: Record<string, string>
  /** 请求参数 */
  params?: Record<string, any>
  /** 是否启用缓存 */
  cache?: boolean
  /** 缓存TTL(毫秒) */
  cacheTTL?: number
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 请求体 */
  body?: any
}

/**
 * 数据源配置接口
 */
export interface DataSourceConfig {
  /** 数据源名称 */
  name: string
  /** 数据源类型 */
  type: string
  /** 基础URL */
  baseUrl: string
  /** 是否启用 */
  enabled: boolean
  /** 优先级 */
  priority: number
  /** 请求配置 */
  requestConfig?: RequestConfig
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** 是否启用缓存 */
  enabled: boolean
  /** 缓存TTL(毫秒) */
  ttl: number
  /** 缓存存储类型 */
  storage: 'localStorage' | 'indexedDB' | 'memory'
  /** 缓存键前缀 */
  keyPrefix: string
  /** 最大缓存条目数 */
  maxEntries?: number
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts: number
  /** 基础延迟时间(毫秒) */
  baseDelay: number
  /** 退避倍数 */
  backoffMultiplier: number
  /** 是否启用抖动 */
  jitter: boolean
  /** 最大延迟时间(毫秒) */
  maxDelay: number
}

/**
 * 反爬虫配置接口
 */
export interface AntiCrawlingConfig {
  /** 最小请求间隔(毫秒) */
  minInterval: number
  /** 最大请求间隔(毫秒) */
  maxInterval: number
  /** 最大并发请求数 */
  maxConcurrent: number
  /** User-Agent列表 */
  userAgents: string[]
  /** 请求头随机化 */
  randomizeHeaders: boolean
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean
  /** 性能监控阈值(毫秒) */
  performanceThreshold: number
  /** 错误率监控阈值(百分比) */
  errorRateThreshold: number
  /** 监控日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * 股票数据服务配置接口
 */
export interface StockDataConfig {
  /** 缓存配置 */
  cache: CacheConfig
  /** 重试配置 */
  retry: RetryConfig
  /** 反爬虫配置 */
  antiCrawling: AntiCrawlingConfig
  /** 监控配置 */
  monitoring: MonitoringConfig
  /** 数据源配置 */
  dataSources: DataSourceConfig[]
  /** 默认请求配置 */
  defaultRequestConfig: RequestConfig
}

/**
 * API端点配置接口
 */
export interface ApiEndpointConfig {
  /** 端点名称 */
  name: string
  /** 端点URL */
  url: string
  /** HTTP方法 */
  method: 'GET' | 'POST'
  /** 请求头模板 */
  headers: Record<string, string>
  /** 参数映射 */
  params?: Record<string, string>
  /** 响应数据映射 */
  dataMapping?: Record<string, string>
}

/**
 * 数据映射接口
 */
export interface DataMapping {
  /** 字段映射关系 */
  fieldMapping: Record<string, string>
  /** 数据转换函数 */
  transform?: (rawData: any) => any
  /** 数据验证函数 */
  validate?: (data: any) => boolean
}

/**
 * 数据源健康状态接口
 */
export interface DataSourceHealth {
  /** 数据源名称 */
  name: string
  /** 是否健康 */
  isHealthy: boolean
  /** 最后检查时间 */
  lastCheckTime: string
  /** 成功率 */
  successRate: number
  /** 平均响应时间 */
  averageResponseTime: number
  /** 错误计数 */
  errorCount: number
  /** 最后错误信息 */
  lastError?: string
}

/**
 * 请求统计接口
 */
export interface RequestStats {
  /** 总请求数 */
  totalRequests: number
  /** 成功请求数 */
  successfulRequests: number
  /** 失败请求数 */
  failedRequests: number
  /** 平均响应时间 */
  averageResponseTime: number
  /** 成功率 */
  successRate: number
  /** 按数据源统计 */
  requestsBySource: Record<string, {
    count: number
    successCount: number
    averageTime: number
  }>
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  /** 总缓存条目数 */
  totalEntries: number
  /** 缓存命中次数 */
  hits: number
  /** 缓存未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 缓存大小(字节) */
  cacheSize: number
  /** 过期条目数 */
  expiredEntries: number
}

/**
 * API响应接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data: T
  /** 错误信息 */
  message?: string
  /** 错误码 */
  code?: string
  /** HTTP状态码 */
  status?: number
  /** 错误类型 */
  errorType?: any
  /** 原始错误 */
  originalError?: any
  /** 响应时间 */
  timestamp: number
}