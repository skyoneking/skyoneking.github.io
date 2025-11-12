import { RequestConfig, ApiResponse, ErrorType } from '../types'

/**
 * HTTP请求服务
 * 提供统一的HTTP请求处理功能，支持重试、缓存、错误处理等
 */
export class ApiService {
  private defaultConfig: RequestConfig
  private interceptors: {
    request: Array<(config: RequestConfig) => RequestConfig>
    response: Array<(response: any) => any>
    error: Array<(error: any) => any>
  }

  constructor(defaultConfig: RequestConfig = {}) {
    this.defaultConfig = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: true,
      cacheTTL: 5 * 60 * 1000, // 5分钟
      ...defaultConfig
    }

    this.interceptors = {
      request: [],
      response: [],
      error: []
    }
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.interceptors.request.push(interceptor)
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.interceptors.response.push(interceptor)
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: (error: any) => any): void {
    this.interceptors.error.push(interceptor)
  }

  /**
   * 执行GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const requestConfig = this.mergeConfig({
      method: 'GET',
      ...config
    })

    return this.request<T>(url, requestConfig)
  }

  /**
   * 执行POST请求
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const requestConfig = this.mergeConfig({
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config
    })

    return this.request<T>(url, requestConfig)
  }

  /**
   * 执行PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const requestConfig = this.mergeConfig({
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config
    })

    return this.request<T>(url, requestConfig)
  }

  /**
   * 执行DELETE请求
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const requestConfig = this.mergeConfig({
      method: 'DELETE',
      ...config
    })

    return this.request<T>(url, requestConfig)
  }

  /**
   * 执行请求
   */
  private async request<T = any>(url: string, config: RequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now()

    try {
      // 应用请求拦截器
      let finalConfig = { ...config }
      for (const interceptor of this.interceptors.request) {
        finalConfig = interceptor(finalConfig)
      }

      // 检查缓存
      if (finalConfig.cache) {
        const cachedData = this.getCachedData<T>(url, finalConfig)
        if (cachedData) {
          return {
            success: true,
            data: cachedData,
            message: '缓存数据',
            status: 200,
            timestamp: Date.now()
          }
        }
      }

      // 构建请求选项
      const requestOptions: RequestInit = {
        method: finalConfig.method || 'GET',
        headers: this.buildHeaders(finalConfig.headers),
        signal: AbortSignal.timeout(finalConfig.timeout || this.defaultConfig.timeout || 10000)
      }

      if (finalConfig.body && finalConfig.method !== 'GET') {
        requestOptions.body = finalConfig.body
      }

      // 构建完整URL
      const fullUrl = this.buildUrl(url, finalConfig.params)

      // 执行请求
      const response = await fetch(fullUrl, requestOptions)

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 解析响应
      let responseData: any
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else if (contentType?.includes('text')) {
        const text = await response.text()

        // 尝试解析JSONP响应
        if (text.includes('jQuery') || text.includes('callback')) {
          const jsonpMatch = text.match(/\((.*)\)/)
          if (jsonpMatch) {
            try {
              responseData = JSON.parse(jsonpMatch[1])
            } catch {
              responseData = text
            }
          } else {
            responseData = text
          }
        } else {
          responseData = text
        }
      } else {
        responseData = await response.blob()
      }

      // 应用响应拦截器
      for (const interceptor of this.interceptors.response) {
        responseData = interceptor(responseData)
      }

      // 缓存响应数据
      if (finalConfig.cache && finalConfig.cacheTTL) {
        this.setCachedData(url, responseData, finalConfig.cacheTTL)
      }

      const endTime = Date.now()
      const responseTime = endTime - startTime

      return {
        success: true,
        data: responseData,
        message: '请求成功',
        status: response.status,
        timestamp: Date.now()
      }
    } catch (error: any) {
      // 应用错误拦截器
      let processedError = error
      for (const interceptor of this.interceptors.error) {
        try {
          processedError = interceptor(processedError)
        } catch (interceptorError) {
          console.warn('Error interceptor failed:', interceptorError)
        }
      }

      return {
        success: false,
        data: null as any,
        message: processedError.message || '请求失败',
        status: processedError.status || 500,
        errorType: this.classifyError(processedError),
        originalError: processedError.stack || processedError.message,
        timestamp: Date.now()
      }
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(config: RequestConfig): RequestConfig {
    return {
      ...this.defaultConfig,
      ...config,
      headers: {
        ...this.defaultConfig.headers,
        ...config.headers
      },
      params: {
        ...this.defaultConfig.params,
        ...config.params
      }
    }
  }

  /**
   * 构建请求头
   */
  private buildHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers()

    // 添加默认头
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    }

    Object.entries(defaultHeaders).forEach(([key, value]) => {
      headers.append(key, value)
    })

    // 添加自定义头
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        headers.append(key, value)
      })
    }

    return headers
  }

  /**
   * 构建URL
   */
  private buildUrl(baseUrl: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return baseUrl
    }

    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    return url.toString()
  }

  /**
   * 提取响应头
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })
    return headers
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN_ERROR

    const message = error.message?.toLowerCase() || ''
    const status = error.status || error.response?.status

    // 根据状态码分类
    if (status) {
      if (status === 429) return ErrorType.RATE_LIMIT
      if (status === 401 || status === 403) return ErrorType.AUTHENTICATION_ERROR
      if (status === 404) return ErrorType.NOT_FOUND
      if (status >= 500) return ErrorType.SERVER_ERROR
      if (status >= 400) return ErrorType.FORBIDDEN
    }

    // 根据错误消息分类
    if (message.includes('timeout') || message.includes('aborted')) {
      return ErrorType.TIMEOUT
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorType.AUTHENTICATION_ERROR
    }
    if (message.includes('cors')) {
      return ErrorType.FORBIDDEN
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * 获取缓存数据
   */
  private getCachedData<T>(url: string, config: RequestConfig): T | null {
    if (typeof window === 'undefined') return null

    try {
      const cacheKey = `api_cache_${btoa(url)}`
      const cachedItem = localStorage.getItem(cacheKey)

      if (!cachedItem) return null

      const { data, timestamp, ttl } = JSON.parse(cachedItem)
      const now = Date.now()

      if (now - timestamp > (ttl || config.cacheTTL || this.defaultConfig.cacheTTL || 300000)) {
        localStorage.removeItem(cacheKey)
        return null
      }

      return data
    } catch (error) {
      console.warn('Failed to get cached data:', error)
      return null
    }
  }

  /**
   * 设置缓存数据
   */
  private setCachedData(url: string, data: any, ttl: number): void {
    if (typeof window === 'undefined') return

    try {
      const cacheKey = `api_cache_${btoa(url)}`
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl
      }

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  }

  /**
   * 清除缓存
   */
  clearCache(pattern?: string): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith('api_cache_'))

      for (const key of cacheKeys) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * 设置默认配置
   */
  setDefaultConfig(config: Partial<RequestConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): RequestConfig {
    return { ...this.defaultConfig }
  }
}