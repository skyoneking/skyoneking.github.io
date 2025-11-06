import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dataService, DataType } from '@/services/dataService'
import { StockDataGenerator } from '@/services/backend/StockDataGenerator'
import type {
  ExchangeDataResponse,
  LimitDataResponse,
  IndexDataResponse,
  StockData
} from '@/services/dataService'

/**
 * 数据加载状态
 */
interface LoadingState {
  sse: boolean
  szse: boolean
  limitup: boolean
  limitdown: boolean
  indices: boolean
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
    indices: false
  })
  const error = ref<string | null>(null)

  // 数据生成器实例
  const dataGenerator = new StockDataGenerator()

  // 数据生成状态
  const generationLoading = ref<boolean>(false)
  const generationProgress = ref<number>(0)
  const generationMessage = ref<string>('')
  const analysisResult = ref<any>(null)
  const cacheStatus = ref<any>(null)

  // 缓存数据
  const cache = ref<{
    sse: CachedData<ExchangeDataResponse> | null
    szse: CachedData<ExchangeDataResponse> | null
    limitup: CachedData<LimitDataResponse> | null
    limitdown: CachedData<LimitDataResponse> | null
    indices: CachedData<IndexDataResponse> | null
  }>({
    sse: null,
    szse: null,
    limitup: null,
    limitdown: null,
    indices: null
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

  const sseData = computed(() => cache.value.sse?.data || null)
  const szseData = computed(() => cache.value.szse?.data || null)
  const limitUpData = computed(() => cache.value.limitup?.data || null)
  const limitDownData = computed(() => cache.value.limitdown?.data || null)
  const indicesData = computed(() => cache.value.indices?.data || null)

  // 获取所有股票数据
  const allStockData = computed(() => {
    const stocks: StockData[] = []

    if (sseData.value?.data) {
      stocks.push(...sseData.value.data)
    }

    if (szseData.value?.data) {
      stocks.push(...szseData.value.data)
    }

    return stocks
  })

  // 获取统计信息
  const statistics = computed(() => {
    const sseCount = sseData.value?.data?.length || 0
    const szseCount = szseData.value?.data?.length || 0
    const limitUpCount = limitUpData.value?.stocks?.length || 0
    const limitDownCount = limitDownData.value?.stocks?.length || 0
    const indicesCount = indicesData.value?.indices?.length || 0

    return {
      totalStocks: sseCount + szseCount,
      sseStocks: sseCount,
      szseStocks: szseCount,
      limitUpStocks: limitUpCount,
      limitDownStocks: limitDownCount,
      indicesCount,
      hasAnyData: hasData.value
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
  const updateCache = <T extends Record<string, any>>(type: DataType, data: T, date: string) => {
    cache.value[type] = {
      data: data as any,
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
    if (!isCacheExpired(cache.value[type]) && cache.value[type]?.date === targetDate) {
      console.log(`[${type.toUpperCase()}] 使用缓存数据: ${targetDate}`)
      return true
    }

    try {
      loading.value[type] = true
      error.value = null

      console.log(`[${type.toUpperCase()}] 开始获取数据: ${targetDate}`)

      const response = await dataService.getDataByType(type, targetDate)

      if (response.success && response.data) {
        updateCache(type, response.data, targetDate)
        console.log(`[${type.toUpperCase()}] 数据获取成功`)
        return true
      } else {
        throw new Error(response.message || '获取数据失败')
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
   * 获取所有类型的数据
   */
  const fetchAllData = async (date?: string): Promise<void> => {
    const targetDate = date || currentDate.value
    const promises = [
      fetchData(DataType.SSE, targetDate),
      fetchData(DataType.SZSE, targetDate),
      fetchData(DataType.LIMIT_UP, targetDate),
      fetchData(DataType.LIMIT_DOWN, targetDate),
      fetchData(DataType.INDICES, targetDate)
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
      cache.value[key as keyof typeof cache.value] = null
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
  const clearCache = (type?: DataType): void => {
    if (type) {
      cache.value[type] = null
    } else {
      Object.keys(cache.value).forEach(key => {
        cache.value[key as keyof typeof cache.value] = null
      })
    }
  }

  // 数据生成相关方法

  /**
   * 生成完整数据
   */
  const generateCompleteData = async (date?: string) => {
    const targetDate = date || currentDate.value

    try {
      generationLoading.value = true
      generationProgress.value = 0
      generationMessage.value = '开始生成数据...'

      const data = await dataGenerator.fetchDateData(targetDate)

      generationProgress.value = 100
      generationMessage.value = '数据生成完成'

      // 更新缓存
      if (data.sse) {
        updateCache(DataType.SSE, data.sse, targetDate)
      }
      if (data.szse) {
        updateCache(DataType.SZSE, data.szse, targetDate)
      }
      if (data.limitUp) {
        updateCache(DataType.LIMIT_UP, data.limitUp, targetDate)
      }
      if (data.limitDown) {
        updateCache(DataType.LIMIT_DOWN, data.limitDown, targetDate)
      }
      if (data.indices) {
        updateCache(DataType.INDICES, data.indices, targetDate)
      }

      return data
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

      const analysis = await dataGenerator.generateCompleteAnalysis(targetDate)
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

      let data
      switch (type) {
        case DataType.SSE:
          data = await dataGenerator.fetchSSEData(targetDate)
          break
        case DataType.SZSE:
          data = await dataGenerator.fetchSZSEData(targetDate)
          break
        case DataType.LIMIT_UP:
          data = await dataGenerator.fetchLimitUpData(targetDate)
          break
        case DataType.LIMIT_DOWN:
          data = await dataGenerator.fetchLimitDownData(targetDate)
          break
        case DataType.INDICES:
          data = await dataGenerator.fetchIndexData(targetDate)
          break
        default:
          throw new Error(`不支持的数据类型: ${type}`)
      }

      if (data) {
        updateCache(type, data, targetDate)
      }

      generationMessage.value = `${type} 数据刷新完成`
      return data
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
      const status = await dataGenerator.getCacheStatus()
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
      await dataGenerator.cleanupExpiredCache(maxAge)
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
    allStockData,
    statistics,

    // 方法
    fetchData,
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