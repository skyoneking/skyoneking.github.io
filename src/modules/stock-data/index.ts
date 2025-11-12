/**
 * 股票数据模块主入口文件
 * 提供统一的接口供其他项目使用
 */

import { StockDataService } from './services/data-service'
import { CacheService } from './services/cache-service'
import { ApiService } from './services/api-service'
import { EastMoneyDataSource } from './sources/eastmoney-source'
import { SSEDataSource } from './sources/sse-source'
import { SZSEDataSource } from './sources/szse-source'
import { DEFAULT_CONFIG, mergeConfig } from './config/default-config'
import {
  DataSourceType,
  DataType,
  ErrorType,
  type StockData,
  type IndexData,
  type MarketStats,
  type RequestConfig,
  type DataSourceConfig,
  type CacheConfig,
  type GetDataOptions,
  type BatchGetDataOptions,
  type SubscribeOptions
} from './types'

// 获取股票数据的选项接口
export interface GetStockDataOptions extends GetDataOptions {
  /** 交易所 */
  exchange?: 'SSE' | 'SZSE' | 'ALL'
}

// 导出所有类型和接口
export * from './types'

// 导出配置和常量
export * from './config/default-config'
export * from './config/api-endpoints'

// 导出工具函数
export * from './utils'

// 导出服务和数据源类
export { StockDataService, CacheService, ApiService } from './services'
export { EastMoneyDataSource, SSEDataSource, SZSEDataSource } from './sources'

/**
 * 默认缓存服务实例
 */
export const defaultCacheService = new CacheService()

/**
 * 默认API服务实例
 */
export const defaultApiService = new ApiService()

/**
 * 默认数据源实例
 */
export const defaultEastMoneySource = new EastMoneyDataSource()
export const defaultSSESource = new SSEDataSource()
export const defaultSZSESource = new SZSEDataSource()

/**
 * 默认股票数据服务实例
 */
export const defaultStockDataService = new StockDataService()

/**
 * 创建配置好的股票数据服务实例
 */
export function createStockDataService(config?: Partial<typeof DEFAULT_CONFIG>): StockDataService {
  const finalConfig = mergeConfig(config)
  const cacheService = new CacheService(finalConfig.services.dataService.cache)
  const apiService = new ApiService()

  return new StockDataService({ apiService, cacheService })
}

/**
 * 股票数据模块类 - 提供简化的API接口
 */
export class StockDataModule {
  private service: StockDataService

  constructor(config?: Partial<typeof DEFAULT_CONFIG>) {
    this.service = createStockDataService(config)
  }

  /**
   * 获取股票数据
   */
  async getStockData(options: GetStockDataOptions): Promise<StockData[]> {
    const exchange = options.exchange || 'ALL'
    const date = options.date || new Date().toISOString().split('T')[0]
    return this.service.getStockData({ exchange, date })
  }

  /**
   * 获取指数数据
   */
  async getIndexData(options?: GetDataOptions): Promise<IndexData[]> {
    const date = options?.date || new Date().toISOString().split('T')[0]
    const response = await this.service.getIndexData(date, options)
    return response.success ? response.data.data : []
  }

  /**
   * 获取涨停股票数据
   */
  async getLimitUpData(options?: GetDataOptions): Promise<StockData[]> {
    const date = options?.date || new Date().toISOString().split('T')[0]
    const response = await this.service.getLimitUpData(date, options)
    return response.success ? response.data.data : []
  }

  /**
   * 获取跌停股票数据
   */
  async getLimitDownData(options?: GetDataOptions): Promise<StockData[]> {
    const date = options?.date || new Date().toISOString().split('T')[0]
    const response = await this.service.getLimitDownData(date, options)
    return response.success ? response.data.data : []
  }

  /**
   * 获取市场统计信息
   */
  async getMarketStats(options?: GetDataOptions): Promise<MarketStats> {
    return this.service.getMarketStats(options)
  }

  /**
   * 批量获取数据
   */
  async batchGetData(requests: Array<{ type: DataType, options?: GetDataOptions }>, batchOptions?: BatchGetDataOptions): Promise<any[]> {
    // 转换请求格式以匹配StockDataService的batchGetData方法
    const formattedRequests = requests.map(req => ({
      type: req.type,
      date: req.options?.date || new Date().toISOString().split('T')[0]
    }))

    return this.service.batchGetData(formattedRequests, batchOptions)
  }

  /**
   * 订阅数据更新
   */
  subscribe(type: DataType, options: SubscribeOptions): () => void {
    const date = options.date || new Date().toISOString().split('T')[0]
    return this.service.subscribe(type, date, {
      interval: options.interval,
      autoReconnect: options.autoReconnect,
      reconnectInterval: options.reconnectInterval,
      onDataChange: options.onDataChange,
      onError: options.onError
    })
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return this.service.getStatus()
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): Promise<void> {
    return this.service.clearCache(pattern)
  }
}

/**
 * 创建股票数据模块实例
 */
export function createStockDataModule(config?: Partial<typeof DEFAULT_CONFIG>): StockDataModule {
  return new StockDataModule(config)
}

/**
 * 默认模块实例 - 提供最简单的使用方式
 */
export const stockDataModule = new StockDataModule()

// 便捷函数式API - 提供最简单的使用方式

/**
 * 获取上交所股票数据
 */
export async function getSSEStocks(options?: GetDataOptions): Promise<StockData[]> {
  return stockDataModule.getStockData({ exchange: 'SSE' as any, ...options })
}

/**
 * 获取深交所股票数据
 */
export async function getSZSEStocks(options?: GetDataOptions): Promise<StockData[]> {
  return stockDataModule.getStockData({ exchange: 'SZSE' as any, ...options })
}

/**
 * 获取所有股票数据
 */
export async function getAllStocks(options?: GetDataOptions): Promise<StockData[]> {
  return stockDataModule.getStockData({ exchange: 'ALL' as any, ...options })
}

/**
 * 获取指数数据
 */
export async function getIndices(options?: GetDataOptions): Promise<IndexData[]> {
  return stockDataModule.getIndexData(options)
}

/**
 * 获取涨停股票
 */
export async function getLimitUpStocks(options?: GetDataOptions): Promise<StockData[]> {
  return stockDataModule.getLimitUpData(options)
}

/**
 * 获取跌停股票
 */
export async function getLimitDownStocks(options?: GetDataOptions): Promise<StockData[]> {
  return stockDataModule.getLimitDownData(options)
}

/**
 * 获取市场统计
 */
export async function getMarketStatistics(options?: GetDataOptions): Promise<MarketStats> {
  return stockDataModule.getMarketStats(options)
}

/**
 * 批量获取股票数据
 */
export async function getBatchData(requests: Array<{ type: DataType, options?: GetDataOptions }>, options?: BatchGetDataOptions): Promise<any[]> {
  return stockDataModule.batchGetData(requests, options)
}

/**
 * 订阅数据更新
 */
export function subscribeDataUpdate(type: DataType, options: SubscribeOptions): () => void {
  return stockDataModule.subscribe(type, options)
}

/**
 * 获取服务状态
 */
export function getServiceStatus() {
  return stockDataModule.getStatus()
}

/**
 * 清除缓存
 */
export function clearStockDataCache(pattern?: string): Promise<void> {
  return stockDataModule.clearCache(pattern)
}

// 模块信息
export const MODULE_INFO = {
  name: 'stock-data',
  version: '1.0.0',
  description: '股票数据获取与处理模块',
  supportedDataSources: Object.values(DataSourceType),
  supportedDataTypes: Object.values(DataType),
  defaultConfig: DEFAULT_CONFIG
}

// 默认导出
export default {
  // 类
  StockDataModule,
  StockDataService,
  CacheService,
  ApiService,
  EastMoneyDataSource,
  SSEDataSource,
  SZSEDataSource,

  // 工厂函数
  createStockDataModule,
  createStockDataService,

  // 默认实例
  stockDataModule,
  defaultStockDataService,
  defaultCacheService,
  defaultApiService,

  // 便捷函数
  getSSEStocks,
  getSZSEStocks,
  getAllStocks,
  getIndices,
  getLimitUpStocks,
  getLimitDownStocks,
  getMarketStatistics,
  getBatchData,
  subscribeDataUpdate,
  getServiceStatus,
  clearStockDataCache,

  // 配置和常量
  DEFAULT_CONFIG,
  MODULE_INFO,

  // 类型
  DataSourceType,
  DataType,
  ErrorType
}