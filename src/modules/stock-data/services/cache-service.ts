import { CacheConfig, CacheStats } from '../types'

/**
 * 缓存项接口
 */
interface CacheItem<T = any> {
  /** 缓存数据 */
  data: T
  /** 创建时间戳 */
  timestamp: number
  /** 过期时间戳 */
  expiresAt: number
  /** 访问次数 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessTime: number
  /** 缓存大小(字节) */
  size: number
}

/**
 * 缓存服务
 * 支持localStorage、IndexedDB和内存存储
 */
export class CacheService {
  private config: CacheConfig
  private memoryCache: Map<string, CacheItem> = new Map()
  private dbName = 'StockDataCache'
  private dbVersion = 1
  private dbStoreName = 'cache'

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30分钟
      storage: 'localStorage',
      keyPrefix: 'stock_data_',
      maxEntries: 1000,
      ...config
    }

    // 定期清理过期缓存
    this.startCleanupTimer()
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return

    const fullKey = this.getFullKey(key)
    const now = Date.now()
    const actualTtl = ttl || this.config.ttl
    const expiresAt = now + actualTtl
    const dataSize = this.calculateSize(data)

    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessTime: now,
      size: dataSize
    }

    try {
      switch (this.config.storage) {
        case 'localStorage':
          await this.setLocalStorage(fullKey, cacheItem)
          break
        case 'indexedDB':
          await this.setIndexedDB(fullKey, cacheItem)
          break
        case 'memory':
          this.setMemory(fullKey, cacheItem)
          break
      }

      // 检查缓存容量限制
      await this.enforceCapacityLimit()
    } catch (error) {
      console.warn('Failed to set cache:', error)
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null

    const fullKey = this.getFullKey(key)

    try {
      let cacheItem: CacheItem<T> | null = null

      switch (this.config.storage) {
        case 'localStorage':
          cacheItem = await this.getLocalStorage(fullKey)
          break
        case 'indexedDB':
          cacheItem = await this.getIndexedDB(fullKey)
          break
        case 'memory':
          cacheItem = this.getMemory(fullKey)
          break
      }

      if (!cacheItem) {
        return null
      }

      // 检查是否过期
      if (Date.now() > cacheItem.expiresAt) {
        await this.delete(key)
        return null
      }

      // 更新访问统计
      cacheItem.accessCount++
      cacheItem.lastAccessTime = Date.now()

      // 更新访问信息（除了IndexedDB，因为读取操作已足够）
      if (this.config.storage !== 'indexedDB') {
        await this.updateAccessInfo(fullKey, cacheItem)
      }

      return cacheItem.data
    } catch (error) {
      console.warn('Failed to get cache:', error)
      return null
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    if (!this.config.enabled) return

    const fullKey = this.getFullKey(key)

    try {
      switch (this.config.storage) {
        case 'localStorage':
          localStorage.removeItem(fullKey)
          break
        case 'indexedDB':
          await this.deleteIndexedDB(fullKey)
          break
        case 'memory':
          this.memoryCache.delete(fullKey)
          break
      }
    } catch (error) {
      console.warn('Failed to delete cache:', error)
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    const data = await this.get(key)
    return data !== null
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    if (!this.config.enabled) return

    try {
      switch (this.config.storage) {
        case 'localStorage':
          await this.clearLocalStorage()
          break
        case 'indexedDB':
          await this.clearIndexedDB()
          break
        case 'memory':
          this.memoryCache.clear()
          break
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * 清除过期缓存
   */
  async clearExpired(): Promise<void> {
    if (!this.config.enabled) return

    try {
      switch (this.config.storage) {
        case 'localStorage':
          await this.clearExpiredLocalStorage()
          break
        case 'indexedDB':
          await this.clearExpiredIndexedDB()
          break
        case 'memory':
          await this.clearExpiredMemory()
          break
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error)
    }
  }

  /**
   * 获取缓存统计
   */
  async getStats(): Promise<CacheStats> {
    if (!this.config.enabled) {
      return {
        totalEntries: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        cacheSize: 0,
        expiredEntries: 0
      }
    }

    try {
      let totalEntries = 0
      let cacheSize = 0
      let expiredEntries = 0

      switch (this.config.storage) {
        case 'localStorage':
          ({ totalEntries, cacheSize, expiredEntries } = await this.getLocalStorageStats())
          break
        case 'indexedDB':
          ({ totalEntries, cacheSize, expiredEntries } = await this.getIndexedDBStats())
          break
        case 'memory':
          ({ totalEntries, cacheSize, expiredEntries } = this.getMemoryStats())
          break
      }

      // 这里简化处理，实际应用中应该记录命中率
      const hits = 0
      const misses = 0
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0

      return {
        totalEntries,
        hits,
        misses,
        hitRate,
        cacheSize,
        expiredEntries
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        totalEntries: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        cacheSize: 0,
        expiredEntries: 0
      }
    }
  }

  /**
   * localStorage相关方法
   */
  private async setLocalStorage<T>(key: string, item: CacheItem<T>): Promise<void> {
    localStorage.setItem(key, JSON.stringify(item))
  }

  private async getLocalStorage<T>(key: string): Promise<CacheItem<T> | null> {
    const item = localStorage.getItem(key)
    if (!item) return null
    return JSON.parse(item)
  }

  private async clearLocalStorage(): Promise<void> {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(this.config.keyPrefix))
    cacheKeys.forEach(key => localStorage.removeItem(key))
  }

  private async clearExpiredLocalStorage(): Promise<void> {
    const keys = Object.keys(localStorage)
    const now = Date.now()

    for (const key of keys) {
      if (key.startsWith(this.config.keyPrefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}')
          if (item.expiresAt && now > item.expiresAt) {
            localStorage.removeItem(key)
          }
        } catch {
          // 清除损坏的缓存项
          localStorage.removeItem(key)
        }
      }
    }
  }

  private async getLocalStorageStats() {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(this.config.keyPrefix))
    let totalEntries = cacheKeys.length
    let cacheSize = 0
    let expiredEntries = 0
    const now = Date.now()

    for (const key of cacheKeys) {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          cacheSize += new Blob([item]).size
          const parsed = JSON.parse(item)
          if (parsed.expiresAt && now > parsed.expiresAt) {
            expiredEntries++
          }
        }
      } catch {
        expiredEntries++
      }
    }

    return { totalEntries, cacheSize, expiredEntries }
  }

  /**
   * IndexedDB相关方法
   */
  private async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(this.dbStoreName)) {
          const store = db.createObjectStore(this.dbStoreName, { keyPath: 'key' })
          store.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })
  }

  private async setIndexedDB<T>(key: string, item: CacheItem<T>): Promise<void> {
    const db = await this.openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.dbStoreName], 'readwrite')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.put({ key, ...item })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async getIndexedDB<T>(key: string): Promise<CacheItem<T> | null> {
    const db = await this.openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.dbStoreName], 'readonly')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const { key: _, ...item } = result
          resolve(item as CacheItem<T>)
        } else {
          resolve(null)
        }
      }
    })
  }

  private async deleteIndexedDB(key: string): Promise<void> {
    const db = await this.openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.dbStoreName], 'readwrite')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async clearIndexedDB(): Promise<void> {
    const db = await this.openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.dbStoreName], 'readwrite')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async clearExpiredIndexedDB(): Promise<void> {
    const db = await this.openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.dbStoreName], 'readwrite')
      const store = transaction.objectStore(this.dbStoreName)
      const index = store.index('expiresAt')
      const now = Date.now()
      const request = index.openCursor(IDBKeyRange.upperBound(now))

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  }

  private async getIndexedDBStats() {
    const db = await this.openIndexedDB()
    return new Promise<{ totalEntries: number, cacheSize: number, expiredEntries: number }>((resolve) => {
      const transaction = db.transaction([this.dbStoreName], 'readonly')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        const items = request.result
        const totalEntries = items.length
        let cacheSize = 0
        let expiredEntries = 0
        const now = Date.now()

        for (const item of items) {
          cacheSize += JSON.stringify(item).length
          if (item.expiresAt && now > item.expiresAt) {
            expiredEntries++
          }
        }

        resolve({ totalEntries, cacheSize, expiredEntries })
      }
    })
  }

  /**
   * 内存缓存相关方法
   */
  private setMemory<T>(key: string, item: CacheItem<T>): void {
    this.memoryCache.set(key, item)
  }

  private getMemory<T>(key: string): CacheItem<T> | null {
    return this.memoryCache.get(key) || null
  }

  private async clearExpiredMemory(): Promise<void> {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key))
  }

  private getMemoryStats() {
    let totalEntries = this.memoryCache.size
    let cacheSize = 0
    let expiredEntries = 0
    const now = Date.now()

    for (const item of this.memoryCache.values()) {
      cacheSize += item.size
      if (now > item.expiresAt) {
        expiredEntries++
      }
    }

    return { totalEntries, cacheSize, expiredEntries }
  }

  /**
   * 辅助方法
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return 0
    }
  }

  private async updateAccessInfo<T>(key: string, item: CacheItem<T>): Promise<void> {
    if (this.config.storage === 'indexedDB') return

    switch (this.config.storage) {
      case 'localStorage':
        await this.setLocalStorage(key, item)
        break
      case 'memory':
        this.setMemory(key, item)
        break
    }
  }

  private async enforceCapacityLimit(): Promise<void> {
    if (!this.config.maxEntries) return

    const stats = await this.getStats()
    if (stats.totalEntries <= this.config.maxEntries) return

    // 获取所有缓存项并按最后访问时间排序
    const items: Array<{ key: string; lastAccessTime: number }> = []

    switch (this.config.storage) {
      case 'localStorage':
        await this.getLocalStorageItemsForEviction(items)
        break
      case 'indexedDB':
        await this.getIndexedDBItemsForEviction(items)
        break
      case 'memory':
        this.getMemoryItemsForEviction(items)
        break
    }

    // 按访问时间排序，最久未访问的排在前面
    items.sort((a, b) => a.lastAccessTime - b.lastAccessTime)

    // 删除最旧的项，直到符合容量限制
    const itemsToDelete = items.slice(0, stats.totalEntries - this.config.maxEntries)
    for (const item of itemsToDelete) {
      await this.delete(item.key.replace(this.config.keyPrefix, ''))
    }
  }

  private async getLocalStorageItemsForEviction(items: Array<{ key: string; lastAccessTime: number }>) {
    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (key.startsWith(this.config.keyPrefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}')
          items.push({ key, lastAccessTime: item.lastAccessTime || 0 })
        } catch {
          // 忽略损坏的项
        }
      }
    }
  }

  private async getIndexedDBItemsForEviction(items: Array<{ key: string; lastAccessTime: number }>) {
    const db = await this.openIndexedDB()
    return new Promise<void>((resolve) => {
      const transaction = db.transaction([this.dbStoreName], 'readonly')
      const store = transaction.objectStore(this.dbStoreName)
      const request = store.getAll()

      request.onsuccess = () => {
        request.result.forEach((item: any) => {
          items.push({ key: item.key, lastAccessTime: item.lastAccessTime || 0 })
        })
        resolve()
      }
    })
  }

  private getMemoryItemsForEviction(items: Array<{ key: string; lastAccessTime: number }>) {
    for (const [key, item] of this.memoryCache.entries()) {
      items.push({ key, lastAccessTime: item.lastAccessTime })
    }
  }

  private startCleanupTimer(): void {
    // 每小时清理一次过期缓存
    setInterval(() => {
      this.clearExpired().catch(error => {
        console.warn('Cache cleanup failed:', error)
      })
    }, 60 * 60 * 1000)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): CacheConfig {
    return { ...this.config }
  }
}