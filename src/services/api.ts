import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

/**
 * API 服务类
 * 提供统一的 HTTP 请求配置和拦截器
 */
class ApiService {
  private instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.BASE_URL || '/',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[API Request Error]', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error('[API Response Error]', error)

        // 统一错误处理
        if (error.response) {
          const { status, data } = error.response
          console.error(`[API Error] ${status}:`, data)

          switch (status) {
            case 404:
              error.message = '请求的数据文件不存在'
              break
            case 500:
              error.message = '服务器内部错误'
              break
            default:
              error.message = data?.message || '网络请求失败'
          }
        } else if (error.request) {
          error.message = '网络连接失败，请检查网络设置'
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * GET 请求
   * @param url 请求地址
   * @param params 请求参数
   * @returns Promise<T>
   */
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.get<T>(url, { params })
      return {
        success: true,
        data: response.data,
        message: '请求成功',
        status: response.status,
        headers: {
          'x-fallback-data': response.headers['x-fallback-data'],
          'x-fallback-date': response.headers['x-fallback-date']
        }
      }
    } catch (error: any) {
      return {
        success: false,
        data: null as any,
        message: error.message || '请求失败',
        status: error.response?.status || 0,
        headers: {
          'x-fallback-data': error.response?.headers?.['x-fallback-data'],
          'x-fallback-date': error.response?.headers?.['x-fallback-date']
        }
      }
    }
  }

  /**
   * POST 请求
   * @param url 请求地址
   * @param data 请求数据
   * @returns Promise<T>
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<T>(url, data)
      return {
        success: true,
        data: response.data,
        message: '请求成功',
        status: response.status
      }
    } catch (error: any) {
      return {
        success: false,
        data: null as any,
        message: error.message || '请求失败',
        status: error.response?.status || 0
      }
    }
  }

  /**
   * 获取原始 axios 实例
   * @returns AxiosInstance
   */
  getInstance(): AxiosInstance {
    return this.instance
  }
}

// 创建并导出 API 服务实例
export const apiService = new ApiService()
export default apiService