/**
 * 股票数据模块类型定义导出
 */

// 股票数据相关类型
export type {
  StockData,
  IndexData,
  MarketStats,
  StockDataResponse,
  IndexDataResponse,
  MarketStatsResponse
} from './stock'

// API相关类型
export type {
  RequestConfig,
  DataSourceConfig,
  CacheConfig,
  RetryConfig,
  AntiCrawlingConfig,
  MonitoringConfig,
  StockDataConfig,
  ApiEndpointConfig,
  DataMapping,
  DataSourceHealth,
  RequestStats,
  CacheStats,
  ApiResponse
} from './api'

// 导出枚举
export { DataSourceType, DataType, ErrorType } from './stock'

// 配置相关类型
export interface ModuleConfig {
  /** 模块是否启用 */
  enabled: boolean
  /** 调试模式 */
  debug: boolean
  /** 服务配置 */
  services: {
    /** 数据服务配置 */
    dataService: Partial<any>
    /** API服务配置 */
    apiService: {
      baseURL?: string
      timeout?: number
      headers?: Record<string, string>
    }
    /** 缓存服务配置 */
    cacheService: {
      ttl: number
      maxSize: number
      storage: 'localStorage' | 'indexedDB' | 'memory'
    }
  }
  /** 数据源配置 */
  sources: {
    /** 主要数据源 */
    primary: any
    /** 备用数据源 */
    fallback: any[]
    /** 自定义数据源 */
    custom?: any[]
  }
}

/**
 * 数据获取选项接口
 */
export interface GetDataOptions {
  /** 是否使用缓存 */
  useCache?: boolean
  /** 强制刷新 */
  forceRefresh?: boolean
  /** 超时时间 */
  timeout?: number
  /** 指定数据源 */
  dataSource?: any
  /** 是否启用重试 */
  retry?: boolean
  /** 自定义请求头 */
  headers?: Record<string, string>
  /** 日期 */
  date?: string
  /** 交易所 */
  exchange?: string
}

/**
 * 批量数据获取选项接口
 */
export interface BatchGetDataOptions extends GetDataOptions {
  /** 并发请求数 */
  concurrency?: number
  /** 失败时是否继续 */
  continueOnError?: boolean
  /** 进度回调 */
  onProgress?: (completed: number, total: number) => void
}

/**
 * 数据订阅选项接口
 */
export interface SubscribeOptions {
  /** 订阅间隔(毫秒) */
  interval: number
  /** 是否自动重连 */
  autoReconnect: boolean
  /** 重连间隔(毫秒) */
  reconnectInterval: number
  /** 数据变化回调 */
  onDataChange: (data: any) => void
  /** 错误回调 */
  onError: (error: Error) => void
  /** 订阅日期 */
  date?: string
}

/**
 * 模块实例接口
 */
export interface IStockDataModule {
  /**
   * 获取上交所数据
   * @param date 日期字符串
   * @param options 获取选项
   */
  getSSEData(date: string, options?: GetDataOptions): Promise<any>

  /**
   * 获取深交所数据
   * @param date 日期字符串
   * @param options 获取选项
   */
  getSZSEData(date: string, options?: GetDataOptions): Promise<any>

  /**
   * 获取指数数据
   * @param date 日期字符串
   * @param options 获取选项
   */
  getIndexData(date: string, options?: GetDataOptions): Promise<any>

  /**
   * 获取涨停数据
   * @param date 日期字符串
   * @param options 获取选项
   */
  getLimitUpData(date: string, options?: GetDataOptions): Promise<any>

  /**
   * 获取跌停数据
   * @param date 日期字符串
   * @param options 获取选项
   */
  getLimitDownData(date: string, options?: GetDataOptions): Promise<any>

  /**
   * 批量获取数据
   * @param requests 请求数组
   * @param options 批量获取选项
   */
  batchGetData(requests: Array<{
    type: any
    date: string
  }>, options?: BatchGetDataOptions): Promise<any[]>

  /**
   * 订阅数据变化
   * @param type 数据类型
   * @param date 日期字符串
   * @param options 订阅选项
   */
  subscribe(type: any, date: string, options: SubscribeOptions): () => void

  /**
   * 获取数据源健康状态
   */
  getDataSourceHealth(): any[]

  /**
   * 获取请求统计
   */
  getRequestStats(): any

  /**
   * 获取缓存统计
   */
  getCacheStats(): any

  /**
   * 清除缓存
   * @param pattern 缓存键模式
   */
  clearCache(pattern?: string): Promise<void>

  /**
   * 配置模块
   * @param config 模块配置
   */
  configure(config: Partial<ModuleConfig>): void

  /**
   * 销毁模块
   */
  destroy(): void
}