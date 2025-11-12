/**
 * 数据服务 - 向后兼容代理
 * 使用新的股票数据模块实现所有功能
 */

import { stockDataModule } from '@/modules/stock-data'
import type { StockData, IndexData, MarketStats, ApiResponse } from '@/modules/stock-data/types'

// 重新导出枚举以保持向后兼容
export enum DataType {
  SSE = 'sse',
  SZSE = 'szse',
  LIMIT_UP = 'limitup',
  LIMIT_DOWN = 'limitdown',
  INDICES = 'indices'
}

/**
 * 交易所数据响应接口
 */
export interface ExchangeDataResponse {
  date: string
  data: StockData[]
  total: number
  success: boolean
  message?: string
}

/**
 * 涨跌停数据响应接口
 */
export interface LimitDataResponse {
  date: string
  stocks: StockData[]
  total: number
  success: boolean
  message?: string
}

/**
 * 指数数据响应接口
 */
export interface IndexDataResponse {
  date: string
  indices: IndexData[]
  total: number
  success: boolean
  message?: string
}

/**
 * 数据服务类 - 使用新模块实现
 */
class DataService {
  /**
   * 根据类型获取数据
   */
  async getDataByType(type: DataType, date?: string): Promise<ApiResponse<any>> {
    try {
      let data: any
      const targetDate = date || new Date().toISOString().split('T')[0]

      switch (type) {
        case DataType.SSE:
          data = await stockDataModule.getStockData({ exchange: 'SSE', date: targetDate })
          return {
            success: true,
            data: {
              date: targetDate,
              data,
              total: data?.length || 0,
              success: true
            } as ExchangeDataResponse,
            timestamp: Date.now()
          }

        case DataType.SZSE:
          data = await stockDataModule.getStockData({ exchange: 'SZSE', date: targetDate })
          return {
            success: true,
            data: {
              date: targetDate,
              data,
              total: data?.length || 0,
              success: true
            } as ExchangeDataResponse,
            timestamp: Date.now()
          }

        case DataType.LIMIT_UP:
          data = await stockDataModule.getLimitUpData({ date: targetDate })
          return {
            success: true,
            data: {
              date: targetDate,
              stocks: data,
              total: data?.length || 0,
              success: true
            } as LimitDataResponse,
            timestamp: Date.now()
          }

        case DataType.LIMIT_DOWN:
          data = await stockDataModule.getLimitDownData({ date: targetDate })
          return {
            success: true,
            data: {
              date: targetDate,
              stocks: data,
              total: data?.length || 0,
              success: true
            } as LimitDataResponse,
            timestamp: Date.now()
          }

        case DataType.INDICES:
          data = await stockDataModule.getIndexData({ date: targetDate })
          return {
            success: true,
            data: {
              date: targetDate,
              indices: data,
              total: data?.length || 0,
              success: true
            } as IndexDataResponse,
            timestamp: Date.now()
          }

        default:
          throw new Error(`不支持的数据类型: ${type}`)
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.message || '获取数据失败',
        timestamp: Date.now()
      }
    }
  }

  /**
   * 获取上交所数据
   */
  async getSSEData(date?: string): Promise<ExchangeDataResponse> {
    const response = await this.getDataByType(DataType.SSE, date)
    return response.data as ExchangeDataResponse
  }

  /**
   * 获取深交所数据
   */
  async getSZSEData(date?: string): Promise<ExchangeDataResponse> {
    const response = await this.getDataByType(DataType.SZSE, date)
    return response.data as ExchangeDataResponse
  }

  /**
   * 获取涨停数据
   */
  async getLimitUpData(date?: string): Promise<LimitDataResponse> {
    const response = await this.getDataByType(DataType.LIMIT_UP, date)
    return response.data as LimitDataResponse
  }

  /**
   * 获取跌停数据
   */
  async getLimitDownData(date?: string): Promise<LimitDataResponse> {
    const response = await this.getDataByType(DataType.LIMIT_DOWN, date)
    return response.data as LimitDataResponse
  }

  /**
   * 获取指数数据
   */
  async getIndexData(date?: string): Promise<IndexDataResponse> {
    const response = await this.getDataByType(DataType.INDICES, date)
    return response.data as IndexDataResponse
  }

  /**
   * 批量获取数据
   */
  async getBatchData(requests: Array<{ type: DataType, date?: string }>): Promise<ApiResponse<any>[]> {
    try {
      const results = await stockDataModule.batchGetData(
        requests.map(req => ({
          type: req.type as any,
          options: { date: req.date }
        }))
      )

      return results.map((data: any) => ({
        success: true,
        data,
        timestamp: Date.now()
      }))
    } catch (error: any) {
      return requests.map(() => ({
        success: false,
        data: null,
        message: error.message || '批量获取失败',
        timestamp: Date.now()
      }))
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return stockDataModule.getStatus()
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<void> {
    await stockDataModule.clearCache(pattern)
  }
}

// 创建单例实例
export const dataService = new DataService()

// 涨跌停股票数据类型（别名）
export type LimitStockData = StockData

// 导出类型以保持向后兼容
export type { StockData, IndexData, MarketStats, ApiResponse } from '@/modules/stock-data/types'