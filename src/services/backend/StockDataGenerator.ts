import { DateUtils } from '@/utils/backend/date-utils'
import { FileUtils } from '@/utils/backend/file-utils'

/**
 * 股票数据生成器
 * 提供完整的数据获取、处理、缓存功能
 */
export class StockDataGenerator {
  private dataDir = 'data'

  /**
   * 获取当前日期的完整数据
   */
  async fetchCurrentData(): Promise<any> {
    const date = DateUtils.getCurrentDate()
    return await this.fetchDateData(date)
  }

  /**
   * 获取指定日期的完整数据
   */
  async fetchDateData(date: string): Promise<any> {
    try {
      console.log(`开始获取 ${date} 的完整数据...`)

      const results = await Promise.allSettled([
        this.fetchSSEData(date),
        this.fetchSZSEData(date),
        this.fetchLimitUpData(date),
        this.fetchLimitDownData(date),
        this.fetchIndexData(date)
      ])

      const [sseResult, szseResult, limitUpResult, limitDownResult, indexResult] = results

      const data = {
        date,
        fetchDate: DateUtils.getCurrentDateTime(),
        sse: sseResult.status === 'fulfilled' ? sseResult.value : null,
        szse: szseResult.status === 'fulfilled' ? szseResult.value : null,
        limitUp: limitUpResult.status === 'fulfilled' ? limitUpResult.value : null,
        limitDown: limitDownResult.status === 'fulfilled' ? limitDownResult.value : null,
        indices: indexResult.status === 'fulfilled' ? indexResult.value : null,
        errors: this.extractErrors([sseResult, szseResult, limitUpResult, limitDownResult, indexResult])
      }

      console.log(`${date} 数据获取完成`)
      return data
    } catch (error: any) {
      console.error(`获取 ${date} 数据失败:`, error)
      throw error
    }
  }

  /**
   * 获取日期范围数据
   */
  async fetchRangeData(startDate: string, endDate: string): Promise<any[]> {
    const dates = DateUtils.getDateRange(startDate, endDate)
    const results: any[] = []

    for (const date of dates) {
      try {
        const data = await this.fetchDateData(date)
        results.push(data)
      } catch (error) {
        console.warn(`获取 ${date} 数据失败:`, error)
        results.push({
          date,
          error: (error as Error).message,
          fetchDate: DateUtils.getCurrentDateTime()
        })
      }
    }

    return results
  }

  /**
   * 获取上证数据
   */
  async fetchSSEData(date: string): Promise<any> {
    try {
      const cacheKey = `${this.dataDir}/sse/${date}.json`

      // 检查缓存
      if (await FileUtils.fileExists(cacheKey)) {
        console.log(`从缓存加载 SSE 数据: ${date}`)
        return await FileUtils.readJsonFile(cacheKey)
      }

      // 从公共目录获取数据
      const publicPath = `/data/sse/${date}.json`
      const data = await FileUtils.downloadPublicFile(publicPath)

      // 保存到缓存和备份
      await FileUtils.saveWithBackup('sse', date, data)
      console.log(`SSE 数据获取并缓存成功: ${date}`)

      return data
    } catch (error) {
      console.error(`获取 SSE 数据失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 获取深证数据
   */
  async fetchSZSEData(date: string): Promise<any> {
    try {
      const cacheKey = `${this.dataDir}/szse/${date}.json`

      // 检查缓存
      if (await FileUtils.fileExists(cacheKey)) {
        console.log(`从缓存加载 SZSE 数据: ${date}`)
        return await FileUtils.readJsonFile(cacheKey)
      }

      // 从公共目录获取数据
      const publicPath = `/data/szse/${date}.json`
      const data = await FileUtils.downloadPublicFile(publicPath)

      // 保存到缓存和备份
      await FileUtils.saveWithBackup('szse', date, data)
      console.log(`SZSE 数据获取并缓存成功: ${date}`)

      return data
    } catch (error) {
      console.error(`获取 SZSE 数据失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 获取涨停数据
   */
  async fetchLimitUpData(date: string): Promise<any> {
    try {
      const cacheKey = `${this.dataDir}/limitup/${date}.json`

      // 检查缓存
      if (await FileUtils.fileExists(cacheKey)) {
        console.log(`从缓存加载涨停数据: ${date}`)
        return await FileUtils.readJsonFile(cacheKey)
      }

      // 从公共目录获取数据
      const publicPath = `/data/limitup/${date}.json`
      const data = await FileUtils.downloadPublicFile(publicPath)

      // 保存到缓存和备份
      await FileUtils.saveWithBackup('limitup', date, data)
      console.log(`涨停数据获取并缓存成功: ${date}`)

      return data
    } catch (error) {
      console.error(`获取涨停数据失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 获取跌停数据
   */
  async fetchLimitDownData(date: string): Promise<any> {
    try {
      const cacheKey = `${this.dataDir}/limitdown/${date}.json`

      // 检查缓存
      if (await FileUtils.fileExists(cacheKey)) {
        console.log(`从缓存加载跌停数据: ${date}`)
        return await FileUtils.readJsonFile(cacheKey)
      }

      // 从公共目录获取数据
      const publicPath = `/data/limitdown/${date}.json`
      const data = await FileUtils.downloadPublicFile(publicPath)

      // 保存到缓存和备份
      await FileUtils.saveWithBackup('limitdown', date, data)
      console.log(`跌停数据获取并缓存成功: ${date}`)

      return data
    } catch (error) {
      console.error(`获取跌停数据失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 获取指数数据
   */
  async fetchIndexData(date: string): Promise<any> {
    try {
      const cacheKey = `${this.dataDir}/indices/${date}.json`

      // 检查缓存
      if (await FileUtils.fileExists(cacheKey)) {
        console.log(`从缓存加载指数数据: ${date}`)
        return await FileUtils.readJsonFile(cacheKey)
      }

      // 从公共目录获取数据（如果存在）
      const publicPath = `/data/indices/${date}.json`

      try {
        const data = await FileUtils.downloadPublicFile(publicPath)

        // 保存到缓存和备份
        await FileUtils.saveWithBackup('indices', date, data)
        console.log(`指数数据获取并缓存成功: ${date}`)

        return data
      } catch (error) {
        // 如果没有指数数据，返回空对象
        const emptyData = {
          fetchDate: DateUtils.getCurrentDateTime(),
          date,
          indices: [],
          source: '无数据',
          metadata: {
            tradingDay: false,
            fetchTime: DateUtils.getCurrentDateTime(),
            dataPoints: 0,
            totalRequested: 0,
            errors: ['指数数据不可用']
          }
        }

        await FileUtils.saveWithBackup('indices', date, emptyData)
        console.log(`创建空指数数据: ${date}`)

        return emptyData
      }
    } catch (error) {
      console.error(`获取指数数据失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 生成完整分析报告
   */
  async generateCompleteAnalysis(date: string): Promise<any> {
    try {
      const [sseData, szseData, limitUpData, limitDownData, indexData] = await Promise.all([
        this.fetchSSEData(date),
        this.fetchSZSEData(date),
        this.fetchLimitUpData(date),
        this.fetchLimitDownData(date),
        this.fetchIndexData(date)
      ])

      const analysis = {
        date,
        generateDate: DateUtils.getCurrentDateTime(),
        summary: this.generateSummary(sseData, szseData, limitUpData, limitDownData, indexData),
        sseAnalysis: this.analyzeSSEData(sseData),
        szseAnalysis: this.analyzeSZSEData(szseData),
        limitUpAnalysis: this.analyzeLimitUpData(limitUpData),
        limitDownAnalysis: this.analyzeLimitDownData(limitDownData),
        indexAnalysis: this.analyzeIndexData(indexData)
      }

      // 保存分析结果到备份
      await FileUtils.createBackup('analysis', date, analysis)

      return analysis
    } catch (error: any) {
      console.error(`生成分析报告失败: ${date}`, error)
      throw error
    }
  }

  /**
   * 获取缓存状态
   */
  async getCacheStatus(): Promise<any> {
    try {
      const cacheStatus = await FileUtils.getCacheStatus()
      const publicDataStatus = await this.getPublicDataStatus()

      return {
        browserCache: cacheStatus,
        publicData: publicDataStatus,
        lastCleanup: new Date().toISOString()
      }
    } catch (error) {
      console.error('获取缓存状态失败:', error)
      return {
        browserCache: { totalFiles: 0, totalSize: 0 },
        publicData: { available: false },
        error: (error as Error).message
      }
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanupExpiredCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      await FileUtils.cleanupExpiredFiles(maxAge)
      console.log(`清理了超过 ${maxAge / (60 * 60 * 1000)} 小时的缓存文件`)
    } catch (error) {
      console.error('清理缓存失败:', error)
    }
  }

  /**
   * 获取公共数据状态
   */
  private async getPublicDataStatus(): Promise<any> {
    const date = DateUtils.getCurrentDate()
    const status: Record<string, boolean> = {
      sse: false,
      szse: false,
      limitup: false,
      limitdown: false,
      indices: false
    }

    const checks = [
      { type: 'sse', path: `/data/sse/${date}.json` },
      { type: 'szse', path: `/data/szse/${date}.json` },
      { type: 'limitup', path: `/data/limitup/${date}.json` },
      { type: 'limitdown', path: `/data/limitdown/${date}.json` },
      { type: 'indices', path: `/data/indices/${date}.json` }
    ]

    await Promise.allSettled(
      checks.map(async check => {
        try {
          await FileUtils.downloadPublicFile(check.path)
          status[check.type] = true
        } catch (error) {
          status[check.type] = false
        }
      })
    )

    return status
  }

  /**
   * 提取错误信息
   */
  private extractErrors(results: any[]): string[] {
    return results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason?.message || '未知错误')
  }

  /**
   * 生成数据摘要
   */
  private generateSummary(...dataSets: any[]): any {
    const totalStocks = dataSets.reduce((sum, data) => {
      if (data && data.data) {
        return sum + (Array.isArray(data.data) ? data.data.length : 0)
      }
      return sum
    }, 0)

    return {
      totalStocks,
      availableDataTypes: dataSets.filter(data => data !== null).length,
      fetchTime: DateUtils.getCurrentDateTime()
    }
  }

  /**
   * 分析上证数据
   */
  private analyzeSSEData(data: any): any {
    if (!data || !data.data) return null

    const stocks = data.data
    const upCount = stocks.filter((s: any) => s.chg_rate > 0).length
    const downCount = stocks.filter((s: any) => s.chg_rate < 0).length
    const avgChange = stocks.reduce((sum: number, s: any) => sum + (s.chg_rate || 0), 0) / stocks.length

    return {
      totalStocks: stocks.length,
      upCount,
      downCount,
      avgChange: avgChange.toFixed(2),
      topGainers: stocks.filter((s: any) => s.chg_rate > 0).sort((a: any, b: any) => b.chg_rate - a.chg_rate).slice(0, 10),
      topLosers: stocks.filter((s: any) => s.chg_rate < 0).sort((a: any, b: any) => a.chg_rate - b.chg_rate).slice(0, 10)
    }
  }

  /**
   * 分析深证数据
   */
  private analyzeSZSEData(data: any): any {
    if (!data || !data.data) return null

    const stocks = data.data
    const upCount = stocks.filter((s: any) => s.chg_rate > 0).length
    const downCount = stocks.filter((s: any) => s.chg_rate < 0).length
    const avgChange = stocks.reduce((sum: number, s: any) => sum + (s.chg_rate || 0), 0) / stocks.length

    return {
      totalStocks: stocks.length,
      upCount,
      downCount,
      avgChange: avgChange.toFixed(2),
      topGainers: stocks.filter((s: any) => s.chg_rate > 0).sort((a: any, b: any) => b.chg_rate - a.chg_rate).slice(0, 10),
      topLosers: stocks.filter((s: any) => s.chg_rate < 0).sort((a: any, b: any) => a.chg_rate - b.chg_rate).slice(0, 10)
    }
  }

  /**
   * 分析涨停数据
   */
  private analyzeLimitUpData(data: any): any {
    if (!data || !data.stocks) return null

    const stocks = data.stocks
    return {
      totalCount: data.totalCount || stocks.length,
      mainBoardCount: data.mainBoardCount || 0,
      growthBoardCount: data.growthBoardCount || 0,
      topStocks: stocks.slice(0, 10),
      avgChangeRate: stocks.reduce((sum: number, s: any) => sum + (s.actualChangeRate || 0), 0) / stocks.length
    }
  }

  /**
   * 分析跌停数据
   */
  private analyzeLimitDownData(data: any): any {
    if (!data || !data.stocks) return null

    const stocks = data.stocks
    return {
      totalCount: data.totalCount || stocks.length,
      mainBoardCount: data.mainBoardCount || 0,
      growthBoardCount: data.growthBoardCount || 0,
      topStocks: stocks.slice(0, 10),
      avgChangeRate: stocks.reduce((sum: number, s: any) => sum + (s.actualChangeRate || 0), 0) / stocks.length
    }
  }

  /**
   * 分析指数数据
   */
  private analyzeIndexData(data: any): any {
    if (!data || !data.indices) return null

    const indices = data.indices
    return {
      totalCount: indices.length,
      avgChange: indices.reduce((sum: number, i: any) => sum + (i.chg_rate || 0), 0) / indices.length,
      topPerformers: indices.filter((i: any) => i.chg_rate > 0).sort((a: any, b: any) => b.chg_rate - a.chg_rate),
      worstPerformers: indices.filter((i: any) => i.chg_rate < 0).sort((a: any, b: any) => a.chg_rate - b.chg_rate)
    }
  }
}