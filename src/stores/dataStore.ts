import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stockDataModule, DataType } from '@/modules/stock-data'
import type { StockData, IndexData, MarketStats } from '@/modules/stock-data/types'

/**
 * 数据加载状态
 */
interface LoadingState {
  sse: boolean
  szse: boolean
  limitup: boolean
  limitdown: boolean
  indices: boolean
  marketStats: boolean
}

/**
 * 缓存数据接口
 */
interface CachedData<T> {
  data: T
  timestamp: number
  date: string
}

/**
 * 数据状态管理 Store
 */
export const useDataStore = defineStore('data', () => {
  // 状态定义
  const currentDate = ref<string>(new Date().toISOString().split('T')[0])
  const loading = ref<LoadingState>({
    sse: false,
    szse: false,
    limitup: false,
    limitdown: false,
    indices: false,
    marketStats: false
  })
  const error = ref<string | null>(null)

  // 数据生成状态
  const generationLoading = ref<boolean>(false)
  const generationProgress = ref<number>(0)
  const generationMessage = ref<string>('')
  const analysisResult = ref<any>(null)
  const cacheStatus = ref<any>(null)

  // 缓存数据
  const cache = ref<{
    sse: CachedData<StockData[]> | null
    szse: CachedData<StockData[]> | null
    limitup: CachedData<StockData[]> | null
    limitdown: CachedData<StockData[]> | null
    indices: CachedData<IndexData[]> | null
    marketStats: CachedData<MarketStats> | null
  }>({
    sse: null,
    szse: null,
    limitup: null,
    limitdown: null,
    indices: null,
    marketStats: null
  })

  // 缓存过期时间（30分钟）
  const CACHE_EXPIRY = 30 * 60 * 1000

  // 计算属性
  const isLoading = computed(() =>
    Object.values(loading.value).some(state => state)
  )

  const hasData = computed(() =>
    Object.values(cache.value).some(cached => cached !== null)
  )

  const sseData = computed(() => cache.value.sse?.data || [])
  const szseData = computed(() => cache.value.szse?.data || [])
  const limitUpData = computed(() => cache.value.limitup?.data || [])
  const limitDownData = computed(() => cache.value.limitdown?.data || [])
  const indicesData = computed(() => cache.value.indices?.data || [])
  const marketStatsData = computed(() => cache.value.marketStats?.data || null)

  // 获取所有股票数据
  const allStockData = computed(() => {
    const stocks: StockData[] = []

    if (sseData.value) {
      stocks.push(...sseData.value)
    }

    if (szseData.value) {
      stocks.push(...szseData.value)
    }

    return stocks
  })

  // 获取统计信息
  const statistics = computed(() => {
    const sseCount = sseData.value?.length || 0
    const szseCount = szseData.value?.length || 0
    const limitUpCount = limitUpData.value?.length || 0
    const limitDownCount = limitDownData.value?.length || 0
    const indicesCount = indicesData.value?.length || 0

    return {
      totalStocks: sseCount + szseCount,
      sseStocks: sseCount,
      szseStocks: szseCount,
      limitUpStocks: limitUpCount,
      limitDownStocks: limitDownCount,
      indicesCount,
      hasAnyData: hasData.value,
      marketStats: marketStatsData.value
    }
  })

  /**
   * 检查缓存是否过期
   */
  const isCacheExpired = (cached: CachedData<any> | null): boolean => {
    if (!cached) return true
    return Date.now() - cached.timestamp > CACHE_EXPIRY
  }

  /**
   * 更新缓存
   */
  const updateCache = <T>(type: string, data: T, date: string) => {
    (cache.value as any)[type] = {
      data,
      timestamp: Date.now(),
      date
    }
  }

  /**
   * 获取数据
   */
  const fetchData = async (type: DataType, date?: string): Promise<boolean> => {
    const targetDate = date || currentDate.value

    // 检查缓存
    if (!isCacheExpired((cache.value as any)[type]) && (cache.value as any)[type]?.date === targetDate) {
      console.log(`[${type.toUpperCase()}] 使用缓存数据: ${targetDate}`)
      return true
    }

    try {
      loading.value[type] = true
      error.value = null

      console.log(`[${type.toUpperCase()}] 开始获取数据: ${targetDate}`)

      let data: any
      switch (type) {
        case DataType.SSE:
          data = await stockDataModule.getStockData({ exchange: 'SSE', date: targetDate })
          break
        case DataType.SZSE:
          data = await stockDataModule.getStockData({ exchange: 'SZSE', date: targetDate })
          break
        case DataType.LIMIT_UP:
          data = await stockDataModule.getLimitUpData({ date: targetDate })
          break
        case DataType.LIMIT_DOWN:
          data = await stockDataModule.getLimitDownData({ date: targetDate })
          break
        case DataType.INDICES:
          data = await stockDataModule.getIndexData({ date: targetDate })
          break
        default:
          throw new Error(`不支持的数据类型: ${type}`)
      }

      if (data) {
        updateCache(type, data, targetDate)
        console.log(`[${type.toUpperCase()}] 数据获取成功`)
        return true
      } else {
        throw new Error('获取数据失败')
      }
    } catch (err: any) {
      console.error(`[${type.toUpperCase()}] 获取数据失败:`, err)
      error.value = err.message || '获取数据失败'
      return false
    } finally {
      loading.value[type] = false
    }
  }

  /**
   * 获取市场统计信息
   */
  const fetchMarketStats = async (date?: string): Promise<boolean> => {
    const targetDate = date || currentDate.value
    const cacheKey = 'marketStats'

    // 检查缓存
    if (!isCacheExpired(cache.value[cacheKey]) && cache.value[cacheKey]?.date === targetDate) {
      console.log(`[MARKET_STATS] 使用缓存数据: ${targetDate}`)
      return true
    }

    try {
      loading.value[cacheKey] = true
      error.value = null

      console.log(`[MARKET_STATS] 开始获取数据: ${targetDate}`)

      const data = await stockDataModule.getMarketStats({ date: targetDate })

      if (data) {
        updateCache(cacheKey, data, targetDate)
        console.log(`[MARKET_STATS] 数据获取成功`)
        return true
      } else {
        throw new Error('获取市场统计失败')
      }
    } catch (err: any) {
      console.error(`[MARKET_STATS] 获取数据失败:`, err)
      error.value = err.message || '获取市场统计失败'
      return false
    } finally {
      loading.value[cacheKey] = false
    }
  }

  /**
   * 获取所有类型的数据
   */
  const fetchAllData = async (date?: string): Promise<void> => {
    const targetDate = date || currentDate.value
    const promises = [
      fetchData(DataType.SSE, targetDate),
      fetchData(DataType.SZSE, targetDate),
      fetchData(DataType.LIMIT_UP, targetDate),
      fetchData(DataType.LIMIT_DOWN, targetDate),
      fetchData(DataType.INDICES, targetDate),
      fetchMarketStats(targetDate)
    ]

    await Promise.allSettled(promises)
  }

  /**
   * 刷新数据
   */
  const refreshData = async (type?: DataType): Promise<void> => {
    if (type) {
      await fetchData(type)
    } else {
      await fetchAllData()
    }
  }

  /**
   * 设置当前日期
   */
  const setCurrentDate = (date: string): void => {
    currentDate.value = date
    // 清除缓存，强制重新获取数据
    Object.keys(cache.value).forEach(key => {
      (cache.value as any)[key] = null
    })
  }

  /**
   * 搜索股票
   */
  const searchStocks = (keyword: string): StockData[] => {
    if (!keyword.trim()) return allStockData.value

    const lowerKeyword = keyword.toLowerCase()
    return allStockData.value.filter(stock =>
      stock.code.toLowerCase().includes(lowerKeyword) ||
      stock.name.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 根据代码获取股票
   */
  const getStockByCode = (code: string): StockData | null => {
    return allStockData.value.find(stock => stock.code === code) || null
  }

  /**
   * 清除错误
   */
  const clearError = (): void => {
    error.value = null
  }

  /**
   * 清除缓存
   */
  const clearCache = (type?: string): void => {
    if (type) {
      (cache.value as any)[type] = null
    } else {
      Object.keys(cache.value).forEach(key => {
        (cache.value as any)[key] = null
      })
    }
  }

  // 数据生成相关方法（保留原有接口，但内部使用新模块）

  /**
   * 生成完整数据
   */
  const generateCompleteData = async (date?: string) => {
    const targetDate = date || currentDate.value

    try {
      generationLoading.value = true
      generationProgress.value = 0
      generationMessage.value = '开始生成数据...'

      // 使用新模块获取所有数据
      await fetchAllData(targetDate)

      generationProgress.value = 100
      generationMessage.value = '数据生成完成'

      return {
        sse: sseData.value,
        szse: szseData.value,
        limitUp: limitUpData.value,
        limitDown: limitDownData.value,
        indices: indicesData.value,
        marketStats: marketStatsData.value
      }
    } catch (error: any) {
      console.error('生成完整数据失败:', error)
      generationMessage.value = `生成失败: ${error.message}`
      throw error
    } finally {
      generationLoading.value = false
      setTimeout(() => {
        generationProgress.value = 0
        generationMessage.value = ''
      }, 3000)
    }
  }

  /**
   * 生成分析报告
   */
  const generateAnalysis = async (date?: string) => {
    const targetDate = date || currentDate.value

    try {
      generationLoading.value = true
      generationMessage.value = '正在生成分析报告...'

      // 基于当前数据生成简单分析
      const stocks = allStockData.value
      const limitUp = limitUpData.value
      const limitDown = limitDownData.value
      const indices = indicesData.value

      const analysis = {
        date: targetDate,
        summary: {
          totalStocks: stocks.length,
          limitUpStocks: limitUp.length,
          limitDownStocks: limitDown.length,
          indicesCount: indices.length
        },
        topGainers: stocks
          .filter(s => s.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 10),
        topLosers: stocks
          .filter(s => s.changePercent < 0)
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, 10),
        mostActive: stocks
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 10),
        indices: indices,
        generatedAt: new Date().toISOString()
      }

      analysisResult.value = analysis
      generationMessage.value = '分析报告生成完成'
      return analysis
    } catch (error: any) {
      console.error('生成分析报告失败:', error)
      generationMessage.value = `分析失败: ${error.message}`
      throw error
    } finally {
      generationLoading.value = false
      setTimeout(() => {
        generationMessage.value = ''
      }, 3000)
    }
  }

  /**
   * 刷新指定类型的数据
   */
  const refreshDataType = async (type: DataType, date?: string) => {
    const targetDate = date || currentDate.value

    try {
      generationLoading.value = true
      generationMessage.value = `正在刷新 ${type} 数据...`

      await fetchData(type, targetDate)

      generationMessage.value = `${type} 数据刷新完成`
      return (cache.value as any)[type]?.data
    } catch (error: any) {
      console.error(`刷新 ${type} 数据失败:`, error)
      generationMessage.value = `刷新失败: ${error.message}`
      throw error
    } finally {
      generationLoading.value = false
      setTimeout(() => {
        generationMessage.value = ''
      }, 3000)
    }
  }

  /**
   * 获取缓存状态
   */
  const getCacheStatusInfo = async () => {
    try {
      // 使用新模块获取缓存状态
      const status = stockDataModule.getStatus()
      cacheStatus.value = status
      return status
    } catch (error: any) {
      console.error('获取缓存状态失败:', error)
      cacheStatus.value = { error: error.message }
      return cacheStatus.value
    }
  }

  /**
   * 清理过期缓存
   */
  const cleanupExpiredCache = async (maxAge?: number) => {
    try {
      // 使用新模块清理缓存
      await stockDataModule.clearCache()
      await getCacheStatusInfo() // 更新缓存状态
    } catch (error: any) {
      console.error('清理缓存失败:', error)
      throw error
    }
  }

  /**
   * 获取数据生成状态
   */
  const getGenerationStatus = () => {
    return {
      loading: generationLoading.value,
      progress: generationProgress.value,
      message: generationMessage.value,
      hasAnalysis: analysisResult.value !== null,
      cacheStatus: cacheStatus.value
    }
  }

  return {
    // 状态
    currentDate,
    loading,
    error,

    // 数据生成状态
    generationLoading,
    generationProgress,
    generationMessage,
    analysisResult,
    cacheStatus,

    // 计算属性
    isLoading,
    hasData,
    sseData,
    szseData,
    limitUpData,
    limitDownData,
    indicesData,
    marketStatsData,
    allStockData,
    statistics,

    // 方法
    fetchData,
    fetchMarketStats,
    fetchAllData,
    refreshData,
    setCurrentDate,
    searchStocks,
    getStockByCode,
    clearError,
    clearCache,

    // 数据生成方法
    generateCompleteData,
    generateAnalysis,
    refreshDataType,
    getCacheStatusInfo,
    cleanupExpiredCache,
    getGenerationStatus
  }
})