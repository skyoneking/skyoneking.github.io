/**
 * 浏览器模拟器
 * 负责User-Agent轮换、HTTP头部随机化、会话管理等
 */

import { AntiCrawlingConfig } from '@/config/anti-crawling'

interface CookieJar {
  [domain: string]: {
    [name: string]: {
      value: string
      domain?: string
      path?: string
      expires?: number
      httpOnly?: boolean
      secure?: boolean
    }
  }
}

interface BrowserSession {
  id: string
  userAgent: string
  headers: Record<string, string>
  cookies: CookieJar
  createdAt: number
  lastUsed: number
}

export class BrowserSimulator {
  private config: AntiCrawlingConfig
  private sessions: Map<string, BrowserSession> = new Map()
  private currentUserAgentIndex = 0

  constructor(config: AntiCrawlingConfig) {
    this.config = config
  }

  /**
   * 获取随机User-Agent
   */
  getRandomUserAgent(): string {
    const userAgents = this.config.userAgents
    if (userAgents.length === 0) {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    // 循环使用User-Agent，避免完全随机
    const userAgent = userAgents[this.currentUserAgentIndex]
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % userAgents.length

    return userAgent
  }

  /**
   * 创建浏览器会话
   */
  createSession(source: string = 'default'): BrowserSession {
    const sessionId = this.generateSessionId()
    const userAgent = this.getRandomUserAgent()

    const session: BrowserSession = {
      id: sessionId,
      userAgent,
      headers: this.generateHeaders(source, userAgent),
      cookies: {},
      createdAt: Date.now(),
      lastUsed: Date.now()
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): BrowserSession | null {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastUsed = Date.now()
    }
    return session || null
  }

  /**
   * 更新会话头部
   */
  updateSessionHeaders(sessionId: string, source: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.headers = this.generateHeaders(source, session.userAgent)
      session.lastUsed = Date.now()
    }
  }

  /**
   * 生成HTTP头部
   */
  private generateHeaders(source: string, userAgent: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      ...this.config.headers.common
    }

    // 根据数据源添加特定头部
    switch (source) {
      case 'eastmoney':
        Object.assign(headers, this.config.headers.eastmoney)
        break
      case 'sse':
        Object.assign(headers, this.config.headers.sse)
        break
    }

    // 添加随机化头部
    this.addRandomizedHeaders(headers)

    return headers
  }

  /**
   * 添加随机化头部
   */
  private addRandomizedHeaders(headers: Record<string, string>): void {
    // 随机DNT头部
    if (Math.random() > 0.5) {
      headers['DNT'] = Math.random() > 0.5 ? '1' : '0'
    }

    // 随机Sec-CH-UA头部（Chrome特有）
    if (headers['User-Agent'].includes('Chrome')) {
      const chromeVersions = ['120.0.0.0', '119.0.0.0', '118.0.0.0']
      const brands = [
        '"Google Chrome";v="' + chromeVersions[Math.floor(Math.random() * chromeVersions.length)] + '"',
        '"Chromium";v="' + chromeVersions[Math.floor(Math.random() * chromeVersions.length)] + '"',
        '"Not=A?Brand";v="24"'
      ]
      headers['Sec-CH-UA'] = brands.join(', ')
      headers['Sec-CH-UA-Mobile'] = '?0'
      headers['Sec-CH-UA-Platform'] = this.getRandomPlatform()
    }

    // 随机缓存控制
    if (Math.random() > 0.7) {
      headers['Cache-Control'] = 'max-age=0'
    }

    // 随机升级不安全请求
    if (Math.random() > 0.5) {
      headers['Upgrade-Insecure-Requests'] = '1'
    }
  }

  /**
   * 获取随机平台
   */
  private getRandomPlatform(): string {
    const platforms = ['"Windows"', '"macOS"', '"Linux"', '"Android"']
    return platforms[Math.floor(Math.random() * platforms.length)]
  }

  /**
   * 解析和存储Cookie
   */
  parseAndStoreCookies(sessionId: string, setCookieHeader: string | string[], domain: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]

    cookies.forEach(cookieStr => {
      try {
        const cookie = this.parseCookieString(cookieStr, domain)
        if (cookie) {
          if (!session.cookies[domain]) {
            session.cookies[domain] = {}
          }
          session.cookies[domain][cookie.name] = cookie
        }
      } catch (error) {
        console.warn('Failed to parse cookie:', cookieStr, error)
      }
    })
  }

  /**
   * 解析Cookie字符串
   */
  private parseCookieString(cookieStr: string, domain: string): any {
    const parts = cookieStr.split(';').map(part => part.trim())
    const [name, value] = parts[0].split('=')

    if (!name || !value) return null

    const cookie: any = {
      name: name.trim(),
      value: value.trim(),
      domain
    }

    // 解析属性
    for (let i = 1; i < parts.length; i++) {
      const [attrName, attrValue] = parts[i].split('=').map(part => part.trim())

      switch (attrName.toLowerCase()) {
        case 'expires':
          cookie.expires = new Date(attrValue).getTime()
          break
        case 'path':
          cookie.path = attrValue
          break
        case 'domain':
          cookie.domain = attrValue
          break
        case 'httponly':
          cookie.httpOnly = true
          break
        case 'secure':
          cookie.secure = true
          break
      }
    }

    return cookie
  }

  /**
   * 生成Cookie头部
   */
  generateCookieHeader(sessionId: string, domain: string): string {
    const session = this.sessions.get(sessionId)
    if (!session || !session.cookies[domain]) {
      return ''
    }

    const cookies = session.cookies[domain]
    const validCookies: string[] = []

    for (const [name, cookie] of Object.entries(cookies)) {
      // 检查是否过期
      if (cookie.expires && Date.now() > cookie.expires) {
        delete cookies[name]
        continue
      }

      validCookies.push(`${name}=${cookie.value}`)
    }

    return validCookies.join('; ')
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24小时

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastUsed > maxAge) {
        this.sessions.delete(sessionId)
      }
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): {
    totalSessions: number
    activeSessions: number
    oldestSession: number
    newestSession: number
  } {
    const now = Date.now()
    const sessions = Array.from(this.sessions.values())

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        oldestSession: 0,
        newestSession: 0
      }
    }

    const activeThreshold = 30 * 60 * 1000 // 30分钟
    const activeSessions = sessions.filter(s => now - s.lastUsed < activeThreshold)

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      oldestSession: Math.min(...sessions.map(s => s.createdAt)),
      newestSession: Math.max(...sessions.map(s => s.createdAt))
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 销毁会话
   */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  /**
   * 销毁所有会话
   */
  destroyAllSessions(): void {
    this.sessions.clear()
  }

  /**
   * 更新配置
   */
  updateConfig(config: AntiCrawlingConfig): void {
    this.config = config
  }
}

// 默认实例
let defaultBrowserSimulator: BrowserSimulator | null = null

/**
 * 获取默认浏览器模拟器实例
 */
export function getDefaultBrowserSimulator(config?: AntiCrawlingConfig): BrowserSimulator {
  if (!defaultBrowserSimulator) {
    if (!config) {
      throw new Error('Config is required for the first initialization')
    }
    defaultBrowserSimulator = new BrowserSimulator(config)
  }
  return defaultBrowserSimulator
}

/**
 * 重置默认浏览器模拟器
 */
export function resetDefaultBrowserSimulator(): void {
  if (defaultBrowserSimulator) {
    defaultBrowserSimulator.destroyAllSessions()
    defaultBrowserSimulator = null
  }
}