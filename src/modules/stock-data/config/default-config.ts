import { DataSourceType, CacheConfig, RetryConfig, AntiCrawlingConfig, MonitoringConfig, StockDataConfig } from '../types'

/**
 * 默认配置类型
 */
interface DefaultConfigType {
  enabled: boolean
  debug: boolean
  services: {
    dataService: {
      cache: CacheConfig
      apiService: {
        baseURL: string
        timeout: number
        headers: {
          Accept: string
          'Content-Type': string
          'X-Requested-With': string
        }
      }
    }
  }
  sources: {
    primary: DataSourceType
    fallback: DataSourceType[]
    custom: any[]
  }
}

/**
 * 模块默认配置
 */
export const DEFAULT_CONFIG: DefaultConfigType = {
  // 模块基本配置
  enabled: true,
  debug: false,

  // 服务配置
  services: {
    // 数据服务配置
    dataService: {
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000, // 30分钟
        storage: 'localStorage' as const,
        keyPrefix: 'stock_data_',
        maxEntries: 1000
      } as CacheConfig,

      // API服务配置
      apiService: {
        baseURL: '',
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }
    }
  },

  // 数据源配置
  sources: {
    primary: DataSourceType.EASTMONEY,
    fallback: [
      DataSourceType.SSE,
      DataSourceType.SZSE
    ],
    custom: []
  }
}

// 数据源配置（作为模块级别的配置）
export const dataSourcesConfig = {
  // 主要数据源
  primary: DataSourceType.EASTMONEY as DataSourceType,

  // 备用数据源
  fallback: [
    DataSourceType.SSE,
    DataSourceType.SZSE
  ] as DataSourceType[],

  // 自定义数据源
  custom: []
}

/**
 * 数据源默认配置
 */
export const DEFAULT_DATA_SOURCE_CONFIGS = {
  [DataSourceType.EASTMONEY]: {
    name: 'EastMoney',
    type: DataSourceType.EASTMONEY,
    baseUrl: 'http://push2.eastmoney.com',
    enabled: true,
    priority: 1,
    requestConfig: {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://quote.eastmoney.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      }
    }
  },

  [DataSourceType.SSE]: {
    name: 'SSE',
    type: DataSourceType.SSE,
    baseUrl: 'http://query.sse.com.cn',
    enabled: true,
    priority: 2,
    requestConfig: {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'http://www.sse.com.cn/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    }
  },

  [DataSourceType.SZSE]: {
    name: 'SZSE',
    type: DataSourceType.SZSE,
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
        'X-Requested-With': 'XMLHttpRequest'
      }
    }
  }
}

/**
 * 缓存默认配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 30 * 60 * 1000, // 30分钟
  storage: 'localStorage',
  keyPrefix: 'stock_data_',
  maxEntries: 1000
}

/**
 * 重试默认配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
  jitter: true,
  maxDelay: 10000
}

/**
 * 反爬虫默认配置
 */
export const DEFAULT_ANTI_CRAWLING_CONFIG: AntiCrawlingConfig = {
  minInterval: 2000,
  maxInterval: 5000,
  maxConcurrent: 2,
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ],
  randomizeHeaders: true
}

/**
 * 监控默认配置
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  performanceThreshold: 5000, // 5秒
  errorRateThreshold: 10,    // 10%
  logLevel: 'info' as const
}

/**
 * 数据获取默认选项
 */
export const DEFAULT_GET_DATA_OPTIONS = {
  useCache: true,
  forceRefresh: false,
  timeout: undefined,
  dataSource: undefined,
  retry: true,
  headers: undefined
}

/**
 * 批量获取默认选项
 */
export const DEFAULT_BATCH_GET_DATA_OPTIONS = {
  ...DEFAULT_GET_DATA_OPTIONS,
  concurrency: 3,
  continueOnError: true,
  onProgress: undefined
}

/**
 * 数据订阅默认选项
 */
export const DEFAULT_SUBSCRIBE_OPTIONS = {
  interval: 60000, // 1分钟
  autoReconnect: true,
  reconnectInterval: 5000, // 5秒
  onDataChange: (data: any) => console.log('Data updated:', data),
  onError: (error: Error) => console.error('Subscription error:', error)
}

/**
 * 开发环境配置
 */
export const DEVELOPMENT_CONFIG = {
  ...DEFAULT_CONFIG,
  debug: true,
  services: {
    ...DEFAULT_CONFIG.services,
    dataService: {
      ...DEFAULT_CONFIG.services.dataService,
      cache: {
        ...DEFAULT_CONFIG.services.dataService.cache,
        ttl: 5 * 60 * 1000 // 开发环境缓存5分钟
      }
    }
  }
}

/**
 * 生产环境配置
 */
export const PRODUCTION_CONFIG = {
  ...DEFAULT_CONFIG,
  debug: false,
  services: {
    ...DEFAULT_CONFIG.services,
    dataService: {
      ...DEFAULT_CONFIG.services.dataService,
      cache: {
        ...DEFAULT_CONFIG.services.dataService.cache,
        ttl: 60 * 60 * 1000 // 生产环境缓存1小时
      }
    }
  }
}

/**
 * 根据环境获取配置
 */
export function getConfigByEnvironment(): typeof DEFAULT_CONFIG {
  // 这里可以根据环境变量或其他条件选择配置
  const isDevelopment = import.meta.env.DEV

  if (isDevelopment) {
    return DEVELOPMENT_CONFIG
  }

  return PRODUCTION_CONFIG
}

/**
 * 合并用户配置与默认配置
 */
export function mergeConfig(userConfig: Partial<DefaultConfigType> = {}): DefaultConfigType {
  const baseConfig = getConfigByEnvironment()

  return {
    ...baseConfig,
    ...userConfig,
    services: {
      ...baseConfig.services,
      ...userConfig.services,
      dataService: {
        ...baseConfig.services.dataService,
        ...userConfig.services?.dataService
      }
    },
    sources: {
      ...baseConfig.sources,
      ...userConfig.sources
    }
  }
}