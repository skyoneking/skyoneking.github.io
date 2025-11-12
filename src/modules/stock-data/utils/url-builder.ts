/**
 * URL构建工具
 */

/**
 * 构建带查询参数的URL
 */
export function buildUrl(baseUrl: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl
  }

  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value))
    }
  })

  return url.toString()
}

/**
 * 构建东方财富API URL
 */
export function buildEastMoneyUrl(endpoint: string, params?: Record<string, any>): string {
  const defaultParams = {
    _: Date.now(),
    ...params
  }

  return buildUrl(endpoint, defaultParams)
}

/**
 * 构建上交所API URL
 */
export function buildSSEUrl(endpoint: string, params?: Record<string, any>): string {
  const defaultParams = {
    jsonCallBack: `jsonpCallback${Date.now()}`,
    _: Date.now(),
    ...params
  }

  return buildUrl(endpoint, defaultParams)
}

/**
 * 构建深交所API URL
 */
export function buildSZSEUrl(endpoint: string, params?: Record<string, any>): string {
  const defaultParams = {
    SHOWTYPE: 'JSON',
    _: Date.now(),
    ...params
  }

  return buildUrl(endpoint, defaultParams)
}

/**
 * 生成随机回调函数名
 */
export function generateCallbackName(prefix: string = 'jsonpCallback'): string {
  const random = Math.random().toString(36).substr(2, 9)
  return `${prefix}${Date.now()}_${random}`
}

/**
 * 构建JSONP请求URL
 */
export function buildJsonpUrl(baseUrl: string, callbackName?: string, params?: Record<string, any>): string {
  const cbName = callbackName || generateCallbackName()
  const urlParams = {
    callback: cbName,
    ...params
  }

  return buildUrl(baseUrl, urlParams)
}

/**
 * 构建带随机参数的URL（用于防止缓存）
 */
export function buildUrlWithRandomParams(baseUrl: string, params?: Record<string, any>): string {
  const randomParams = {
    _t: Date.now(),
    _r: Math.random().toString(36).substr(2, 9),
    ...params
  }

  return buildUrl(baseUrl, randomParams)
}

/**
 * URL编码参数
 */
export function encodeParams(params: Record<string, any>): Record<string, string> {
  const encoded: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      encoded[key] = encodeURIComponent(String(value))
    }
  })

  return encoded
}

/**
 * 从URL中提取参数
 */
export function extractUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {}

  try {
    const urlObj = new URL(url)
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })
  } catch (error) {
    console.warn('Failed to parse URL:', error)
  }

  return params
}

/**
 * 从URL中提取路径
 */
export function extractUrlPath(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch (error) {
    console.warn('Failed to parse URL:', error)
    return ''
  }
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 检查URL是否为HTTPS
 */
export function isHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 检查URL是否为HTTP
 */
export function isHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * 获取URL的域名
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return ''
  }
}

/**
 * 获取URL的端口
 */
export function getPort(url: string): number {
  try {
    const urlObj = new URL(url)
    return urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80)
  } catch {
    return 80
  }
}

/**
 * 规范化URL（确保协议存在）
 */
export function normalizeUrl(url: string, defaultProtocol: 'http' | 'https' = 'https'): string {
  if (!url) return ''

  // 如果URL没有协议，添加默认协议
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `${defaultProtocol}://${url}`
  }

  return url
}

/**
 * 移除URL中的查询参数
 */
export function removeQueryParams(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.origin}${urlObj.pathname}`
  } catch {
    return url
  }
}

/**
 * 添加查询参数到URL
 */
export function addQueryParams(url: string, params: Record<string, any>): string {
  try {
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        urlObj.searchParams.set(key, String(value))
      }
    })
    return urlObj.toString()
  } catch {
    return url
  }
}

/**
 * 合并URL查询参数
 */
export function mergeQueryParams(url: string, params: Record<string, any>): string {
  const existingParams = extractUrlParams(url)
  const mergedParams = { ...existingParams, ...params }
  return addQueryParams(removeQueryParams(url), mergedParams)
}

/**
 * 构建分页URL
 */
export function buildPaginatedUrl(baseUrl: string, page: number, pageSize: number, params?: Record<string, any>): string {
  const paginationParams = {
    page: String(page),
    pageSize: String(pageSize),
    pn: String(page),
    pz: String(pageSize),
    ...params
  }

  return buildUrl(baseUrl, paginationParams)
}

/**
 * 构建带时间范围的URL
 */
export function buildTimeRangeUrl(baseUrl: string, startDate: string, endDate: string, params?: Record<string, any>): string {
  const timeParams = {
    startDate,
    endDate,
    start: startDate,
    end: endDate,
    begin: startDate,
    finish: endDate,
    ...params
  }

  return buildUrl(baseUrl, timeParams)
}

/**
 * 生成随机User-Agent
 */
export function generateRandomUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ]

  return browsers[Math.floor(Math.random() * browsers.length)]
}

/**
 * 构建带有请求头的配置
 */
export function buildRequestHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const defaultHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': generateRandomUserAgent()
  }

  return { ...defaultHeaders, ...customHeaders }
}

/**
 * 解析JSONP响应
 */
export function parseJsonpResponse(responseText: string): any {
  try {
    // 尝试直接解析JSON
    return JSON.parse(responseText)
  } catch {
    // 尝试解析JSONP格式
    const jsonpMatch = responseText.match(/^[^{]*\((.*)\)[^}]*$/)
    if (jsonpMatch) {
      return JSON.parse(jsonpMatch[1])
    }

    // 尝试查找其他JSONP格式
    const callbackMatch = responseText.match(/callback\d+\((.*)\)/)
    if (callbackMatch) {
      return JSON.parse(callbackMatch[1])
    }

    const jqueryMatch = responseText.match(/jQuery\d+_\d+\((.*)\)/)
    if (jqueryMatch) {
      return JSON.parse(jqueryMatch[1])
    }

    throw new Error('无法解析JSONP响应')
  }
}

/**
 * URL安全编码
 */
export function safeEncodeURIComponent(str: string): string {
  try {
    return encodeURIComponent(str)
  } catch {
    // 如果编码失败，手动替换特殊字符
    return str.replace(/[^a-zA-Z0-9]/g, (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
  }
}