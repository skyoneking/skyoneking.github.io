<template>
  <div class="data-generation-panel">
    <el-card class="generation-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h3>数据生成控制</h3>
          <el-button
            size="small"
            @click="refreshCacheStatus"
            :loading="loadingCacheStatus"
          >
            <el-icon><Refresh /></el-icon>
            刷新状态
          </el-button>
        </div>
      </template>

      <!-- 生成控制 -->
      <div class="generation-controls">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-date-picker
              v-model="selectedDate"
              type="date"
              placeholder="选择日期"
              :disabled-date="disabledDate"
              style="width: 100%"
              @change="handleDateChange"
            />
          </el-col>
          <el-col :span="12">
            <el-button
              type="primary"
              :loading="dataStore.generationLoading"
              @click="generateCompleteData"
              style="width: 100%"
            >
              <el-icon><DataAnalysis /></el-icon>
              生成完整数据
            </el-button>
          </el-col>
        </el-row>

        <el-row :gutter="16" style="margin-top: 16px">
          <el-col :span="6">
            <el-button
              type="success"
              :loading="dataStore.generationLoading"
              @click="refreshDataType('sse')"
              style="width: 100%"
            >
              刷新上证数据
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="success"
              :loading="dataStore.generationLoading"
              @click="refreshDataType('szse')"
              style="width: 100%"
            >
              刷新深证数据
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="warning"
              :loading="dataStore.generationLoading"
              @click="generateAnalysis"
              style="width: 100%"
            >
              生成分析报告
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button
              type="info"
              :loading="dataStore.generationLoading"
              @click="refreshAllData"
              style="width: 100%"
            >
              刷新全部数据
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 进度显示 -->
      <div v-if="dataStore.generationLoading" class="progress-section">
        <el-progress
          :percentage="dataStore.generationProgress"
          :status="dataStore.generationProgress === 100 ? 'success' : undefined"
        />
        <p class="progress-message">{{ dataStore.generationMessage }}</p>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="缓存状态">
            <el-tag :type="getCacheStatusTag()" size="small">
              {{ getCacheStatusText() }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分析报告">
            <el-tag :type="dataStore.analysisResult ? 'success' : 'info'" size="small">
              {{ dataStore.analysisResult ? '已生成' : '未生成' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数据完整性">
            <el-tag :type="getDataCompletenessTag()" size="small">
              {{ getDataCompletenessText() }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="dataStore.cacheStatus" class="cache-details">
          <h4>缓存详情</h4>
          <el-descriptions :column="2" size="small">
            <el-descriptions-item label="总文件数">
              {{ dataStore.cacheStatus.browserCache?.totalFiles || 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="总大小">
              {{ formatFileSize(dataStore.cacheStatus.browserCache?.totalSize || 0) }}
            </el-descriptions-item>
            <el-descriptions-item label="公共数据">
              <el-tag :type="getPublicDataTag()" size="small">
                {{ getPublicDataStatus() }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后清理">
              {{ formatTime(dataStore.cacheStatus.lastCleanup) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 缓存管理 -->
      <div class="cache-management">
        <el-divider>缓存管理</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-button
              type="danger"
              size="small"
              @click="clearCache"
              style="width: 100%"
            >
              <el-icon><Delete /></el-icon>
              清除所有缓存
            </el-button>
          </el-col>
          <el-col :span="8">
            <el-button
              type="warning"
              size="small"
              @click="cleanupExpiredCache"
              :loading="cleaningCache"
              style="width: 100%"
            >
              <el-icon><DeleteFilled /></el-icon>
              清理过期缓存
            </el-button>
          </el-col>
          <el-col :span="8">
            <el-button
              type="info"
              size="small"
              @click="exportData"
              style="width: 100%"
            >
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 分析结果对话框 -->
    <el-dialog
      v-model="analysisDialogVisible"
      title="数据分析报告"
      width="80%"
      class="analysis-dialog"
    >
      <div v-if="dataStore.analysisResult" class="analysis-content">
        <el-tabs type="card">
          <el-tab-pane label="数据摘要" name="summary">
            <div class="summary-section">
              <el-row :gutter="16">
                <el-col :span="8">
                  <el-statistic title="总股票数" :value="dataStore.analysisResult.summary?.totalStocks || 0" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="可用数据类型" :value="dataStore.analysisResult.summary?.availableDataTypes || 0" />
                </el-col>
                <el-col :span="8">
                  <el-statistic title="生成时间" :value="dataStore.analysisResult.summary?.fetchTime" />
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <el-tab-pane label="上证分析" name="sse">
            <div v-if="dataStore.analysisResult.sseAnalysis" class="analysis-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="股票总数">
                  {{ dataStore.analysisResult.sseAnalysis.totalStocks }}
                </el-descriptions-item>
                <el-descriptions-item label="上涨家数">
                  <el-tag type="success">{{ dataStore.analysisResult.sseAnalysis.upCount }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="下跌家数">
                  <el-tag type="success">{{ dataStore.analysisResult.sseAnalysis.downCount }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="平均涨跌幅">
                  {{ dataStore.analysisResult.sseAnalysis.avgChange }}%
                </el-descriptions-item>
              </el-descriptions>

              <h4>涨幅榜 (前10)</h4>
              <el-table :data="dataStore.analysisResult.sseAnalysis.topGainers" size="small">
                <el-table-column prop="code" label="代码" width="80" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="chg_rate" label="涨跌幅" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.chg_rate > 0 ? 'success' : 'danger'">{{ row.chg_rate?.toFixed(2) }}%</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="深证分析" name="szse">
            <div v-if="dataStore.analysisResult.szseAnalysis" class="analysis-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="股票总数">
                  {{ dataStore.analysisResult.szseAnalysis.totalStocks }}
                </el-descriptions-item>
                <el-descriptions-item label="上涨家数">
                  <el-tag type="success">{{ dataStore.analysisResult.szseAnalysis.upCount }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="下跌家数">
                  <el-tag type="success">{{ dataStore.analysisResult.szseAnalysis.downCount }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="平均涨跌幅">
                  {{ dataStore.analysisResult.szseAnalysis.avgChange }}%
                </el-descriptions-item>
              </el-descriptions>

              <h4>涨幅榜 (前10)</h4>
              <el-table :data="dataStore.analysisResult.szseAnalysis.topGainers" size="small">
                <el-table-column prop="code" label="代码" width="80" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="chg_rate" label="涨跌幅" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.chg_rate > 0 ? 'success' : 'danger'">{{ row.chg_rate?.toFixed(2) }}%</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="涨停分析" name="limitup">
            <div v-if="dataStore.analysisResult.limitUpAnalysis" class="analysis-section">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="涨停总数">
                  {{ dataStore.analysisResult.limitUpAnalysis.totalCount }}
                </el-descriptions-item>
                <el-descriptions-item label="主板数量">
                  {{ dataStore.analysisResult.limitUpAnalysis.mainBoardCount }}
                </el-descriptions-item>
                <el-descriptions-item label="创业板数量">
                  {{ dataStore.analysisResult.limitUpAnalysis.growthBoardCount }}
                </el-descriptions-item>
                <el-descriptions-item label="平均涨幅">
                  {{ dataStore.analysisResult.limitUpAnalysis.avgChangeRate?.toFixed(2) }}%
                </el-descriptions-item>
              </el-descriptions>

              <h4>涨停股票 (前10)</h4>
              <el-table :data="dataStore.analysisResult.limitUpAnalysis.topStocks" size="small">
                <el-table-column prop="code" label="代码" width="80" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="actualChangeRate" label="实际涨幅" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.actualChangeRate > 0 ? 'danger' : 'success'">{{ row.actualChangeRate?.toFixed(2) }}%</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  DataAnalysis,
  Delete,
  DeleteFilled,
  Download
} from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/dataStore'
import { DateUtils } from '@/utils/backend/date-utils'
import { DataType } from '@/config/api/api-endpoints'

const dataStore = useDataStore()

// 响应式数据
const selectedDate = ref<Date>(new Date())
const analysisDialogVisible = ref(false)
const loadingCacheStatus = ref(false)
const cleaningCache = ref(false)

// 计算属性
const disabledDate = (time: Date) => {
  return time.getTime() > Date.now()
}

// 方法
const handleDateChange = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0]
  dataStore.setCurrentDate(dateStr)
}

const generateCompleteData = async () => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]

  try {
    await dataStore.generateCompleteData(dateStr)
    ElMessage.success('数据生成完成')
  } catch (error: any) {
    ElMessage.error(`数据生成失败: ${error.message}`)
  }
}

const generateAnalysis = async () => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]

  try {
    await dataStore.generateAnalysis(dateStr)
    analysisDialogVisible.value = true
    ElMessage.success('分析报告生成完成')
  } catch (error: any) {
    ElMessage.error(`分析报告生成失败: ${error.message}`)
  }
}

const refreshDataType = async (type: string) => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]

  try {
    await dataStore.refreshDataType(type as DataType, dateStr)
    ElMessage.success(`${type} 数据刷新完成`)
  } catch (error: any) {
    ElMessage.error(`${type} 数据刷新失败: ${error.message}`)
  }
}

const refreshAllData = async () => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]

  try {
    await dataStore.fetchAllData(dateStr)
    ElMessage.success('所有数据刷新完成')
  } catch (error: any) {
    ElMessage.error(`数据刷新失败: ${error.message}`)
  }
}

const refreshCacheStatus = async () => {
  loadingCacheStatus.value = true
  try {
    await dataStore.getCacheStatusInfo()
    ElMessage.success('缓存状态已更新')
  } catch (error: any) {
    ElMessage.error(`获取缓存状态失败: ${error.message}`)
  } finally {
    loadingCacheStatus.value = false
  }
}

const clearCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清除所有缓存吗？', '确认清除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    dataStore.clearCache()
    ElMessage.success('缓存已清除')
  } catch {
    // 用户取消操作
  }
}

const cleanupExpiredCache = async () => {
  cleaningCache.value = true
  try {
    await dataStore.cleanupExpiredCache()
    ElMessage.success('过期缓存清理完成')
  } catch (error: any) {
    ElMessage.error(`清理缓存失败: ${error.message}`)
  } finally {
    cleaningCache.value = false
  }
}

const exportData = () => {
  // 导出数据的实现
  const data = {
    date: dataStore.currentDate,
    sseData: dataStore.sseData,
    szseData: dataStore.szseData,
    limitUpData: dataStore.limitUpData,
    limitDownData: dataStore.limitDownData,
    indicesData: dataStore.indicesData,
    analysisResult: dataStore.analysisResult,
    exportTime: DateUtils.getCurrentDateTime()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `stock-data-${dataStore.currentDate}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
  ElMessage.success('数据导出成功')
}

const getCacheStatusTag = () => {
  if (!dataStore.cacheStatus) return 'info'
  const hasPublicData = getPublicDataStatus() === '完整'
  return hasPublicData ? 'success' : 'warning'
}

const getCacheStatusText = () => {
  if (!dataStore.cacheStatus) return '未知'
  const hasPublicData = getPublicDataStatus() === '完整'
  return hasPublicData ? '正常' : '不完整'
}

const getDataCompletenessTag = () => {
  const hasAllData = dataStore.sseData && dataStore.szseData
  return hasAllData ? 'success' : 'warning'
}

const getDataCompletenessText = () => {
  const hasAllData = dataStore.sseData && dataStore.szseData
  return hasAllData ? '完整' : '不完整'
}

const getPublicDataTag = () => {
  if (!dataStore.cacheStatus?.publicData) return 'info'
  const status = dataStore.cacheStatus.publicData
  if (status.sse && status.szse && status.limitup && status.limitdown) {
    return 'success'
  } else if (status.sse || status.szse) {
    return 'warning'
  } else {
    return 'danger'
  }
}

const getPublicDataStatus = () => {
  if (!dataStore.cacheStatus?.publicData) return '未知'
  const status = dataStore.cacheStatus.publicData
  if (status.sse && status.szse && status.limitup && status.limitdown) {
    return '完整'
  } else if (status.sse || status.szse) {
    return '部分'
  } else {
    return '缺失'
  }
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const formatTime = (time: string) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString()
}

// 生命周期
onMounted(() => {
  refreshCacheStatus()
})
</script>

<style lang="scss" scoped>
.data-generation-panel {
  .generation-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        color: #303133;
      }
    }
  }

  .generation-controls {
    margin-bottom: 20px;
  }

  .progress-section {
    margin: 20px 0;
    text-align: center;

    .progress-message {
      margin-top: 10px;
      color: #606266;
      font-size: 14px;
    }
  }

  .status-section {
    .cache-details {
      margin-top: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
        font-size: 14px;
      }
    }
  }

  .cache-management {
    margin-top: 20px;
  }
}

.analysis-dialog {
  .analysis-content {
    .analysis-section {
      h4 {
        margin: 16px 0 12px 0;
        color: #303133;
        font-size: 16px;
      }

      .summary-section {
        margin-bottom: 20px;
      }
    }
  }
}
</style>