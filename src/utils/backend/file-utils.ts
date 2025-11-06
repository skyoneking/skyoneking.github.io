/**
 * 文件工具类
 * 提供文件读写、目录操作等功能
 * 注意：这是浏览器环境的简化版本，使用localStorage和IndexedDB
 */

// 文件操作接口
interface FileOperation {
  read: (path: string) => Promise<any>
  write: (path: string, data: any) => Promise<void>
  exists: (path: string) => Promise<boolean>
  ensureDir: (path: string) => Promise<void>
}

// 浏览器文件操作实现
class BrowserFileOperation implements FileOperation {
  private prefix = 'stock_data_'

  async read(path: string): Promise<any> {
    try {
      // 先尝试从localStorage读取
      const localStorageData = localStorage.getItem(this.prefix + path)
      if (localStorageData) {
        return JSON.parse(localStorageData)
      }

      // 尝试从IndexedDB读取
      return await this.readFromIndexedDB(path)
    } catch (error) {
      console.warn(`读取文件失败: ${path}`, error)
      return null
    }
  }

  async write(path: string, data: any): Promise<void> {
    try {
      const dataStr = JSON.stringify(data)

      // 保存到localStorage (限制大小)
      if (dataStr.length < 4 * 1024 * 1024) { // 4MB限制
        localStorage.setItem(this.prefix + path, dataStr)
      }

      // 同时保存到IndexedDB
      await this.writeToIndexedDB(path, data)
    } catch (error) {
      console.error(`写入文件失败: ${path}`, error)
      throw error
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      // 检查localStorage
      if (localStorage.getItem(this.prefix + path)) {
        return true
      }

      // 检查IndexedDB
      return await this.existsInIndexedDB(path)
    } catch (error) {
      console.warn(`检查文件存在失败: ${path}`, error)
      return false
    }
  }

  async ensureDir(_path: string): Promise<void> {
    // 浏览器环境中不需要创建目录
    // 路径通过key存储
  }

  private async readFromIndexedDB(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StockDataDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['files'], 'readonly')
        const store = transaction.objectStore('files')
        const getRequest = store.get(path)

        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.data || null)
        }
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' })
        }
      }
    })
  }

  private async writeToIndexedDB(path: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StockDataDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['files'], 'readwrite')
        const store = transaction.objectStore('files')
        const putRequest = store.put({ path, data, timestamp: Date.now() })

        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' })
        }
      }
    })
  }

  private async existsInIndexedDB(path: string): Promise<boolean> {
    try {
      const result = await this.readFromIndexedDB(path)
      return result !== null
    } catch {
      return false
    }
  }
}

// 创建文件操作实例
const fileOperation: FileOperation = new BrowserFileOperation()

/**
 * 文件工具类
 */
export class FileUtils {
  /**
   * 读取JSON文件
   */
  static async readJsonFile(path: string): Promise<any> {
    const data = await fileOperation.read(path)
    return data
  }

  /**
   * 写入JSON文件
   */
  static async writeJsonFile(path: string, data: any): Promise<void> {
    await fileOperation.write(path, data)
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(path: string): Promise<boolean> {
    return await fileOperation.exists(path)
  }

  /**
   * 确保目录存在
   */
  static async ensureDir(path: string): Promise<void> {
    await fileOperation.ensureDir(path)
  }

  /**
   * 下载文件（从公共目录）
   */
  static async downloadPublicFile(path: string): Promise<any> {
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`下载文件失败: ${path}`, error)
      throw error
    }
  }

  /**
   * 获取文件大小（估算）
   */
  static async getFileSize(path: string): Promise<number> {
    try {
      const data = await fileOperation.read(path)
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      localStorage.removeItem('stock_data_' + path)
      await this.deleteFromIndexedDB(path)
    } catch (error) {
      console.error(`删除文件失败: ${path}`, error)
    }
  }

  private static async deleteFromIndexedDB(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StockDataDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['files'], 'readwrite')
        const store = transaction.objectStore('files')
        const deleteRequest = store.delete(path)

        deleteRequest.onerror = () => reject(deleteRequest.error)
        deleteRequest.onsuccess = () => resolve()
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' })
        }
      }
    })
  }

  /**
   * 清理过期文件
   */
  static async cleanupExpiredFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StockDataDB', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['files'], 'readwrite')
        const store = transaction.objectStore('files')
        const getAllRequest = store.getAll()

        getAllRequest.onerror = () => reject(getAllRequest.error)
        getAllRequest.onsuccess = () => {
          const files = getAllRequest.result
          const now = Date.now()
          const expiredFiles = files.filter((file: any) =>
            now - file.timestamp > maxAge
          )

          let deleteCount = 0
          const totalFiles = expiredFiles.length

          if (totalFiles === 0) {
            resolve()
            return
          }

          expiredFiles.forEach((file: any) => {
            const deleteRequest = store.delete(file.path)
            deleteRequest.onerror = () => console.error(`删除过期文件失败: ${file.path}`)
            deleteRequest.onsuccess = () => {
              deleteCount++
              if (deleteCount === totalFiles) {
                console.log(`清理了 ${totalFiles} 个过期文件`)
                resolve()
              }
            }
          })
        }
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' })
        }
      }
    })
  }

  /**
   * 获取缓存状态
   */
  static async getCacheStatus(): Promise<{
    totalFiles: number
    totalSize: number
    oldestFile: number
    newestFile: number
  }> {
    return new Promise((resolve) => {
      const request = indexedDB.open('StockDataDB', 1)

      request.onerror = () => {
        resolve({
          totalFiles: 0,
          totalSize: 0,
          oldestFile: 0,
          newestFile: 0
        })
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction(['files'], 'readonly')
        const store = transaction.objectStore('files')
        const getAllRequest = store.getAll()

        getAllRequest.onerror = () => {
          resolve({
            totalFiles: 0,
            totalSize: 0,
            oldestFile: 0,
            newestFile: 0
          })
        }

        getAllRequest.onsuccess = () => {
          const files = getAllRequest.result
          let totalSize = 0
          let oldestFile = Date.now()
          let newestFile = 0

          files.forEach((file: any) => {
            const size = JSON.stringify(file.data).length
            totalSize += size
            oldestFile = Math.min(oldestFile, file.timestamp)
            newestFile = Math.max(newestFile, file.timestamp)
          })

          resolve({
            totalFiles: files.length,
            totalSize,
            oldestFile,
            newestFile
          })
        }
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' })
        }
      }
    })
  }

  /**
   * 创建数据备份
   */
  static async createBackup(dataType: string, date: string, data: any): Promise<void> {
    try {
      const backupPath = `data-backup/${dataType}/${date}.json`
      await this.writeJsonFile(backupPath, data)
      console.log(`✓ 创建备份成功: ${backupPath}`)
    } catch (error) {
      console.warn(`⚠ 创建备份失败: ${dataType}/${date}`, error)
    }
  }

  /**
   * 从备份恢复数据
   */
  static async restoreFromBackup(dataType: string, date: string): Promise<any> {
    try {
      const backupPath = `data-backup/${dataType}/${date}.json`
      return await this.readJsonFile(backupPath)
    } catch (error) {
      console.warn(`⚠ 从备份恢复失败: ${dataType}/${date}`, error)
      return null
    }
  }

  /**
   * 同时保存到生产和备份位置
   */
  static async saveWithBackup(dataType: string, date: string, data: any): Promise<void> {
    const promises = [
      this.writeJsonFile(`dist/data/${dataType}/${date}.json`, data),
      this.createBackup(dataType, date, data)
    ]

    await Promise.allSettled(promises)
    console.log(`✅ 数据已保存到生产和备份位置: ${dataType}/${date}`)
  }

  /**
   * 尝试从多个源加载数据
   */
  static async loadFromMultipleSources(dataType: string, date: string): Promise<any> {
    const sources = [
      `/data/${dataType}/${date}.json`, // 首先尝试从API服务器获取
      `data-backup/${dataType}/${date}.json`, // 从本地存储备份
      `dist/data/${dataType}/${date}.json` // 从生产目录
    ]

    for (const source of sources) {
      try {
        if (source.startsWith('/data/')) {
          // 从API服务器加载
          console.log(`[DataLoader] 尝试从服务器加载: ${source}`)
          return await this.downloadPublicFile(source)
        } else {
          // 从本地存储加载
          console.log(`[DataLoader] 尝试从本地存储加载: ${source}`)
          const exists = await this.fileExists(source)
          if (exists) {
            return await this.readJsonFile(source)
          }
        }
      } catch (error) {
        console.warn(`[DataLoader] 尝试从 ${source} 加载数据失败:`, error)
        continue
      }
    }

    throw new Error(`无法从任何源加载数据: ${dataType}/${date}`)
  }
}