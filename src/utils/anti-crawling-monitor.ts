/**
 * 反爬虫监控和日志系统
 * 负责监控请求成功率、检测反爬虫措施、告警通知等
 */

import { AntiCrawlingConfig } from '@/config/anti-crawling'

export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
  metadata?: Record<string, any>
}

export interface RequestMetrics {
  timestamp: number
  source: string
  success: boolean
  responseTime: number
  statusCode?: number
  errorType?: string
  userAgent?: string
}

export interface AlertInfo {
  id: string
  timestamp: number
  level: 'warning' | 'error' | 'critical'
  type: string
  message: string
  source: string
  metadata: Record<string, any>
  resolved: boolean
  resolvedAt?: number
}

export interface MonitoringStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  successRate: number
  requestsBySource: Record<string, {
    total: number
    success: number
    failure: number
    avgResponseTime: number
    successRate: number
  }>
  alerts: {
    total: number
    active: number
    resolved: number
  }
  timeWindow: number
}

export class AntiCrawlingMonitor {
  private config: AntiCrawlingConfig
  private logs: LogEntry[] = []
  private metrics: RequestMetrics[] = []
  private alerts: Map<string, AlertInfo> = new Map()
  private logCallbacks: ((entry: LogEntry) => void)[] = []
  private alertCallbacks: ((alert: AlertInfo) => void)[] = []
  private monitoringInterval: number | null = null

  constructor(config: AntiCrawlingConfig) {
    this.config = config
    if (config.monitoring.enabled) {
      this.startMonitoring()
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return
    }

    // 每分钟清理旧数据和生成统计
    this.monitoringInterval = setInterval(() => {
      this.cleanupOldData()
      this.checkAlertConditions()
    }, 60000)

    this.info('monitor', 'Anti-crawling monitoring started')
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      this.info('monitor', 'Anti-crawling monitoring stopped')
    }
  }

  /**
   * 记录请求指标
   */
  recordRequest(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    const entry: RequestMetrics = {
      timestamp: Date.now(),
      ...metrics
    }

    this.metrics.push(entry)

    // 保持指标历史在合理范围内
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000)
    }

    // 检查是否需要立即告警
    this.checkImmediateAlerts(entry)
  }

  /**
   * 记录日志
   */
  debug(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', source, message, metadata)
  }

  info(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', source, message, metadata)
  }

  warn(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', source, message, metadata)
  }

  error(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', source, message, metadata)
  }

  /**
   * 内部日志方法
   */
  private log(level: LogEntry['level'], source: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      metadata
    }

    this.logs.push(entry)

    // 保持日志历史在配置的限制范围内
    const maxLogs = this.config.monitoring.maxLogEntries
    if (this.logs.length > maxLogs) {
      this.logs = this.logs.slice(-maxLogs)
    }

    // 触发日志回调
    this.logCallbacks.forEach(callback => {
      try {
        callback(entry)
      } catch (error) {
        console.error('Log callback error:', error)
      }
    })

    // 控制台输出
    const timestamp = new Date(entry.timestamp).toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`

    switch (level) {
      case 'error':
        console.error(logMessage, metadata || '')
        break
      case 'warn':
        console.warn(logMessage, metadata || '')
        break
      case 'debug':
        if (this.config.monitoring.logLevel === 'debug') {
          console.debug(logMessage, metadata || '')
        }
        break
      default:
        console.log(logMessage, metadata || '')
    }
  }

  /**
   * 创建告警
   */
  createAlert(
    level: AlertInfo['level'],
    type: string,
    message: string,
    source: string,
    metadata: Record<string, any> = {}
  ): void {
    const alertId = this.generateAlertId(type, source)
    const alert: AlertInfo = {
      id: alertId,
      timestamp: Date.now(),
      level,
      type,
      message,
      source,
      metadata,
      resolved: false
    }

    // 如果已存在相同类型的未解决告警，更新它
    const existingAlert = this.alerts.get(alertId)
    if (existingAlert && !existingAlert.resolved) {
      existingAlert.timestamp = alert.timestamp
      existingAlert.message = message
      existingAlert.metadata = { ...existingAlert.metadata, ...metadata }
      return
    }

    this.alerts.set(alertId, alert)
    this.warn('alert', `Alert created: ${type} - ${message}`, { level, source })

    // 触发告警回调
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Alert callback error:', error)
      }
    })
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
      this.info('alert', `Alert resolved: ${alert.type} - ${alert.message}`, { source: alert.source })
    }
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(type: string, source: string): string {
    return `${type}_${source}_${Date.now()}`
  }

  /**
   * 检查立即告警条件
   */
  private checkImmediateAlerts(metrics: RequestMetrics): void {
    const { source, statusCode } = metrics

    // 认证失败告警
    if (statusCode === 401) {
      this.createAlert('critical', 'auth_failure', 'Authentication failed', source, {
        statusCode,
        userAgent: metrics.userAgent
      })
      return
    }

    // 禁止访问告警
    if (statusCode === 403) {
      this.createAlert('error', 'access_denied', 'Access denied - possible anti-bot detection', source, {
        statusCode,
        userAgent: metrics.userAgent
      })
      return
    }

    // 限流告警
    if (statusCode === 429) {
      this.createAlert('warning', 'rate_limit', 'Rate limit detected', source, {
        statusCode,
        responseTime: metrics.responseTime
      })
      return
    }

    // 连续失败告警
    const recentFailures = this.getRecentFailures(source, 5)
    if (recentFailures >= 5) {
      this.createAlert('error', 'consecutive_failures', `${recentFailures} consecutive failures detected`, source, {
        failureCount: recentFailures
      })
    }
  }

  /**
   * 检查定期告警条件
   */
  private checkAlertConditions(): void {
    const stats = this.getStats()

    // 整体成功率过低告警
    if (stats.successRate < this.config.monitoring.alertThreshold) {
      this.createAlert(
        'error',
        'low_success_rate',
        `Overall success rate ${(stats.successRate * 100).toFixed(1)}% below threshold`,
        'global',
        { successRate: stats.successRate, threshold: this.config.monitoring.alertThreshold }
      )
    }

    // 检查各个数据源的状态
    Object.entries(stats.requestsBySource).forEach(([source, sourceStats]) => {
      if (sourceStats.successRate < this.config.monitoring.alertThreshold) {
        this.createAlert(
          'warning',
          'source_low_success_rate',
          `Source ${source} success rate ${(sourceStats.successRate * 100).toFixed(1)}% below threshold`,
          source,
          { successRate: sourceStats.successRate }
        )
      }

      // 响应时间过长告警
      if (sourceStats.avgResponseTime > 10000) { // 10秒
        this.createAlert(
          'warning',
          'slow_response',
          `Source ${source} average response time ${sourceStats.avgResponseTime}ms is too slow`,
          source,
          { avgResponseTime: sourceStats.avgResponseTime }
        )
      }
    })
  }

  /**
   * 获取最近的失败次数
   */
  private getRecentFailures(source: string, limit: number): number {
    const now = Date.now()
    const window = 5 * 60 * 1000 // 5分钟窗口

    const recentMetrics = this.metrics.filter(m =>
      m.source === source &&
      !m.success &&
      now - m.timestamp < window
    ).slice(-limit)

    return recentMetrics.length
  }

  /**
   * 清理旧数据
   */
  private cleanupOldData(): void {
    const now = Date.now()
    const window = this.config.monitoring.metricsWindow

    // 清理旧的指标数据
    const originalLength = this.metrics.length
    this.metrics = this.metrics.filter(m => now - m.timestamp < window)

    if (this.metrics.length !== originalLength) {
      this.debug('monitor', `Cleaned up ${originalLength - this.metrics.length} old metric entries`)
    }

    // 清理旧的已解决告警
    const alertWindow = 24 * 60 * 60 * 1000 // 24小时
    const resolvedAlertsToRemove: string[] = []

    this.alerts.forEach((alert, id) => {
      if (alert.resolved && alert.resolvedAt && now - alert.resolvedAt > alertWindow) {
        resolvedAlertsToRemove.push(id)
      }
    })

    resolvedAlertsToRemove.forEach(id => this.alerts.delete(id))

    if (resolvedAlertsToRemove.length > 0) {
      this.debug('monitor', `Cleaned up ${resolvedAlertsToRemove.length} old resolved alerts`)
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): MonitoringStats {
    const now = Date.now()
    const window = this.config.monitoring.metricsWindow

    // 过滤时间窗口内的指标
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < window)

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        successRate: 1,
        requestsBySource: {},
        alerts: {
          total: this.alerts.size,
          active: Array.from(this.alerts.values()).filter(a => !a.resolved).length,
          resolved: Array.from(this.alerts.values()).filter(a => a.resolved).length
        },
        timeWindow: window
      }
    }

    const totalRequests = recentMetrics.length
    const successfulRequests = recentMetrics.filter(m => m.success).length
    const failedRequests = totalRequests - successfulRequests
    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1

    // 按数据源分组统计
    const requestsBySource: MonitoringStats['requestsBySource'] = {}
    const sourceGroups = new Map<string, RequestMetrics[]>()

    recentMetrics.forEach(m => {
      if (!sourceGroups.has(m.source)) {
        sourceGroups.set(m.source, [])
      }
      sourceGroups.get(m.source)!.push(m)
    })

    sourceGroups.forEach((sourceMetrics, source) => {
      const sourceTotal = sourceMetrics.length
      const sourceSuccess = sourceMetrics.filter(m => m.success).length
      const sourceAvgResponseTime = sourceMetrics.reduce((sum, m) => sum + m.responseTime, 0) / sourceTotal

      requestsBySource[source] = {
        total: sourceTotal,
        success: sourceSuccess,
        failure: sourceTotal - sourceSuccess,
        avgResponseTime: sourceAvgResponseTime,
        successRate: sourceTotal > 0 ? sourceSuccess / sourceTotal : 1
      }
    })

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      successRate,
      requestsBySource,
      alerts: {
        total: this.alerts.size,
        active: Array.from(this.alerts.values()).filter(a => !a.resolved).length,
        resolved: Array.from(this.alerts.values()).filter(a => a.resolved).length
      },
      timeWindow: window
    }
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(limit: number = 100, level?: LogEntry['level']): LogEntry[] {
    let logs = [...this.logs].reverse() // 最新的在前

    if (level) {
      logs = logs.filter(log => log.level === level)
    }

    return logs.slice(0, limit)
  }

  /**
   * 获取活跃的告警
   */
  getActiveAlerts(): AlertInfo[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * 添加日志回调
   */
  onLog(callback: (entry: LogEntry) => void): void {
    this.logCallbacks.push(callback)
  }

  /**
   * 添加告警回调
   */
  onAlert(callback: (alert: AlertInfo) => void): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * 移除日志回调
   */
  removeLogCallback(callback: (entry: LogEntry) => void): void {
    const index = this.logCallbacks.indexOf(callback)
    if (index > -1) {
      this.logCallbacks.splice(index, 1)
    }
  }

  /**
   * 移除告警回调
   */
  removeAlertCallback(callback: (alert: AlertInfo) => void): void {
    const index = this.alertCallbacks.indexOf(callback)
    if (index > -1) {
      this.alertCallbacks.splice(index, 1)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: AntiCrawlingConfig): void {
    const wasEnabled = this.config.monitoring.enabled
    this.config = config

    if (!wasEnabled && config.monitoring.enabled) {
      this.startMonitoring()
    } else if (wasEnabled && !config.monitoring.enabled) {
      this.stopMonitoring()
    }
  }

  /**
   * 重置所有数据
   */
  reset(): void {
    this.logs.length = 0
    this.metrics.length = 0
    this.alerts.clear()
    this.info('monitor', 'Monitor data reset')
  }
}

// 默认实例
let defaultMonitor: AntiCrawlingMonitor | null = null

/**
 * 获取默认监控器实例
 */
export function getDefaultMonitor(config?: AntiCrawlingConfig): AntiCrawlingMonitor {
  if (!defaultMonitor) {
    if (!config) {
      throw new Error('Config is required for the first initialization')
    }
    defaultMonitor = new AntiCrawlingMonitor(config)
  }
  return defaultMonitor
}

/**
 * 重置默认监控器
 */
export function resetDefaultMonitor(): void {
  if (defaultMonitor) {
    defaultMonitor.stopMonitoring()
    defaultMonitor = null
  }
}