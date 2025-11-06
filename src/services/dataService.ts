import { apiService } from './api'
import { FileUtils } from '@/utils/backend/file-utils'
import type { ApiResponse } from '@/types'

/**
 * 数据类型枚举
 */
export enum DataType {
  SSE = 'sse',
  SZSE = 'szse',
  LIMIT_UP = 'limitup',
  LIMIT_DOWN = 'limitdown',
  INDICES = 'indices'
}

/**
 * 交易所股票数据接口
 */
export interface StockData {
  code: string
  name: string
  open: number
  high: number
  low: number
  last: number
  prev_close: number
  change: number
  chg_rate: number
  volume: number
  amount: number
  tradephase: string
  amp_rate: number
  cpxxsubtype: string
  cpxxprodusta: string
}

/**
 * 交易所数据响应接口
 */
export interface ExchangeDataResponse {
  fetchDate: string
  exchange: string
  date: string
  data: StockData[]
}

/**
 * 涨跌停股票数据接口
 */
export interface LimitStockData {
  rank: number
  code: string
  name: string
  exchange: string
  boardType: string
  prevClose: number
  last: number
  limitThreshold: number
  limitRate: number
  actualChangeRate: number
  change: number
  open: number
  high: number
  low: number
  volume: number
  amount: number
  amp_rate: number
  tradephase: string
}

/**
 * 涨跌停数据响应接口
 */
export interface LimitDataResponse {
  generateDate: string
  targetDate: string
  totalCount: number
  mainBoardCount: number
  growthBoardCount: number
  calculationMethod: string
  stocks: LimitStockData[]
}

/**
 * 指数数据接口
 */
export interface IndexData {
  code: string
  name: string
  market: string
  open: number
  high: number
  low: number
  last: number
  prev_close: number
  change: number
  chg_rate: number
  volume: number
  amount: number
  amp_rate: number
  turnover: number
  pe: number
  pb: number
  market_cap: number
  update_time: string
}

/**
 * 指数数据响应接口
 */
export interface IndexDataResponse {
  fetchDate: string
  indices: IndexData[]
  source: string
  metadata: {
    tradingDay: boolean
    fetchTime: string
    dataPoints: number
    totalRequested: number
    errors: string[]
  }
}

/**
 * 数据服务类
 * 专门处理本地 JSON 数据的获取
 */
export class DataService {
  /**
   * 获取交易所数据
   * @param exchange 交易所 (sse/szse)
   * @param date 日期 (YYYY-MM-DD)
   * @returns Promise<ApiResponse<ExchangeDataResponse>>
   */
  async getExchangeData(exchange: string, date: string): Promise<ApiResponse<ExchangeDataResponse>> {
    try {
      // 首先尝试从多源加载数据
      const data = await FileUtils.loadFromMultipleSources(exchange, date)
      return {
        success: true,
        data,
        message: '数据加载成功',
        status: 200
      }
    } catch (error) {
      // 如果多源加载失败，回退到API服务
      try {
        const url = `/data/${exchange}/${date}.json`
        const response = await apiService.get<ExchangeDataResponse>(url)

        // 检查是否使用了回退数据
        if (response.success && response.data) {
          const isFallback = response.headers?.['x-fallback-data'] === 'true'
          const fallbackDate = response.headers?.['x-fallback-date']

          if (isFallback && fallbackDate) {
            return {
              ...response,
              message: `已加载最新可用数据 (${fallbackDate})，请求日期 (${date}) 的数据暂未生成`,
              fallbackUsed: true,
              fallbackDate
            }
          }
        }

        return response
      } catch (apiError: any) {
        // 根据错误类型提供更具体的错误信息
        let errorMessage = `无法加载${exchange}数据`
        let errorStatus = 404

        if (apiError.status === 500) {
          errorMessage = `服务器内部错误，请稍后重试或联系管理员`
          errorStatus = 500
        } else if (apiError.message?.includes('文件未找到')) {
          errorMessage = `${exchange.toUpperCase()}数据文件不存在 (${date})`
          errorStatus = 404
        } else if (apiError.message?.includes('网络')) {
          errorMessage = `网络连接失败，请检查网络设置`
          errorStatus = 0
        }

        return {
          success: false,
          data: null as any,
          message: errorMessage,
          status: errorStatus,
          originalError: apiError.message
        }
      }
    }
  }

  /**
   * 获取涨跌停数据
   * @param type 类型 (limitup/limitdown)
   * @param date 日期 (YYYY-MM-DD)
   * @returns Promise<ApiResponse<LimitDataResponse>>
   */
  async getLimitData(type: string, date: string): Promise<ApiResponse<LimitDataResponse>> {
    try {
      // 首先尝试从多源加载数据
      const data = await FileUtils.loadFromMultipleSources(type, date)
      return {
        success: true,
        data,
        message: '数据加载成功',
        status: 200
      }
    } catch (error) {
      // 如果多源加载失败，回退到API服务
      try {
        const url = `/data/${type}/${date}.json`
        return await apiService.get<LimitDataResponse>(url)
      } catch (apiError) {
        return {
          success: false,
          data: null as any,
          message: `无法加载${type}数据: ${date}`,
          status: 404
        }
      }
    }
  }

  /**
   * 获取指数数据
   * @param date 日期 (YYYY-MM-DD)
   * @returns Promise<ApiResponse<IndexDataResponse>>
   */
  async getIndexData(date: string): Promise<ApiResponse<IndexDataResponse>> {
    try {
      // 首先尝试从多源加载数据
      const data = await FileUtils.loadFromMultipleSources('indices', date)
      return {
        success: true,
        data,
        message: '数据加载成功',
        status: 200
      }
    } catch (error) {
      // 如果多源加载失败，回退到API服务
      try {
        const url = `/data/indices/${date}.json`
        return await apiService.get<IndexDataResponse>(url)
      } catch (apiError) {
        return {
          success: false,
          data: null as any,
          message: `无法加载指数数据: ${date}`,
          status: 404
        }
      }
    }
  }

  /**
   * 根据数据类型获取数据
   * @param type 数据类型
   * @param date 日期
   * @returns Promise<ApiResponse<any>>
   */
  async getDataByType(type: DataType, date: string): Promise<ApiResponse<any>> {
    switch (type) {
      case DataType.SSE:
        return this.getExchangeData('sse', date)
      case DataType.SZSE:
        return this.getExchangeData('szse', date)
      case DataType.LIMIT_UP:
        return this.getLimitData('limitup', date)
      case DataType.LIMIT_DOWN:
        return this.getLimitData('limitdown', date)
      case DataType.INDICES:
        return this.getIndexData(date)
      default:
        return {
          success: false,
          data: null,
          message: '不支持的数据类型',
          status: 400
        }
    }
  }

  /**
   * 获取可用的日期列表
   * @returns Promise<string[]>
   */
  async getAvailableDates(): Promise<string[]> {
    // 这里可以实现获取可用日期的逻辑
    // 暂时返回最近几天的日期
    const dates: string[] = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  /**
   * 检查数据文件是否存在
   * @param type 数据类型
   * @param date 日期
   * @returns Promise<boolean>
   */
  async checkDataExists(type: DataType, date: string): Promise<boolean> {
    const response = await this.getDataByType(type, date)
    return response.success
  }
}

// 创建并导出数据服务实例
export const dataService = new DataService()
export default dataService