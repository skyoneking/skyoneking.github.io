<template>
  <div class="data-viewer">
    <!-- 顶部控制栏 -->
    <div class="viewer-header">
      <div class="header-left">
        <h2>股票数据展示</h2>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          :disabled-date="disabledDate"
          @change="handleDateChange"
          style="margin-left: 16px"
        />
      </div>

      <div class="header-right">
        <el-button @click="refreshAllData" :loading="dataStore.isLoading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="showJsonDisplay">
          <el-icon><Document /></el-icon>
          JSON 原始数据
        </el-button>
      </div>
    </div>

    <!-- 数据生成面板 -->
    <!-- <div class="generation-panel-section">
      <DataGenerationPanel />
    </div> -->

    <!-- 统计卡片 -->
    <!-- <div class="statistics-cards">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="总股票数" :value="dataStore.statistics.totalStocks">
              <template #suffix>支</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="上证股票" :value="dataStore.statistics.sseStocks">
              <template #suffix>支</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="深证股票" :value="dataStore.statistics.szseStocks">
              <template #suffix>支</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="涨停股票" :value="dataStore.statistics.limitUpStocks">
              <template #suffix>支</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="跌停股票" :value="dataStore.statistics.limitDownStocks">
              <template #suffix>支</template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="4">
          <el-card class="stat-card">
            <el-statistic title="指数数量" :value="dataStore.statistics.indicesCount">
              <template #suffix>个</template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </div> -->

    <!-- 数据标签页 -->
    <div class="viewer-content">
      <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
        <!-- 上证股票 -->
        <el-tab-pane label="上证股票" name="sse">
          <template #label>
            <span class="tab-label">
              上证股票
              <el-badge :value="dataStore.sseData?.data?.length || 0" type="primary" />
            </span>
          </template>
          <div class="tab-content">
            <stock-data-table
              v-if="dataStore.sseData?.data"
              :data="dataStore.sseData.data"
              :loading="dataStore.loading.sse"
              title="上证股票"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 深证股票 -->
        <el-tab-pane label="深证股票" name="szse">
          <template #label>
            <span class="tab-label">
              深证股票
              <el-badge :value="dataStore.szseData?.data?.length || 0" type="success" />
            </span>
          </template>
          <div class="tab-content">
            <stock-data-table
              v-if="dataStore.szseData?.data"
              :data="dataStore.szseData.data"
              :loading="dataStore.loading.szse"
              title="深证股票"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 涨停股票 -->
        <el-tab-pane label="涨停股票" name="limitup">
          <template #label>
            <span class="tab-label">
              涨停股票
              <el-badge :value="dataStore.limitUpData?.stocks?.length || 0" type="danger" />
            </span>
          </template>
          <div class="tab-content">
            <limit-stock-table
              v-if="dataStore.limitUpData?.stocks"
              :data="dataStore.limitUpData.stocks"
              :loading="dataStore.loading.limitup"
              title="涨停股票"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 跌停股票 -->
        <el-tab-pane label="跌停股票" name="limitdown">
          <template #label>
            <span class="tab-label">
              跌停股票
              <el-badge :value="dataStore.limitDownData?.stocks?.length || 0" type="warning" />
            </span>
          </template>
          <div class="tab-content">
            <limit-stock-table
              v-if="dataStore.limitDownData?.stocks"
              :data="dataStore.limitDownData.stocks"
              :loading="dataStore.loading.limitdown"
              title="跌停股票"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 指数数据 -->
        <el-tab-pane label="指数数据" name="indices">
          <template #label>
            <span class="tab-label">
              指数数据
              <el-badge :value="dataStore.indicesData?.indices?.length || 0" type="info" />
            </span>
          </template>
          <div class="tab-content">
            <index-data-table
              v-if="dataStore.indicesData?.indices"
              :data="dataStore.indicesData.indices"
              :loading="dataStore.loading.indices"
              title="指数数据"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- JSON 数据对话框 -->
    <el-dialog
      v-model="jsonDialogVisible"
      title="JSON 原始数据"
      width="90%"
      :fullscreen="isFullscreen"
      class="json-dialog"
    >
      <div class="json-dialog-content">
        <el-tabs type="card">
          <el-tab-pane label="上证数据" name="sse-json">
            <json-display
              v-if="dataStore.sseData"
              :data="dataStore.sseData"
              title="上证数据"
            />
            <el-empty v-else description="暂无数据" />
          </el-tab-pane>
          <el-tab-pane label="深证数据" name="szse-json">
            <json-display
              v-if="dataStore.szseData"
              :data="dataStore.szseData"
              title="深证数据"
            />
            <el-empty v-else description="暂无数据" />
          </el-tab-pane>
          <el-tab-pane label="涨停数据" name="limitup-json">
            <json-display
              v-if="dataStore.limitUpData"
              :data="dataStore.limitUpData"
              title="涨停数据"
            />
            <el-empty v-else description="暂无数据" />
          </el-tab-pane>
          <el-tab-pane label="跌停数据" name="limitdown-json">
            <json-display
              v-if="dataStore.limitDownData"
              :data="dataStore.limitDownData"
              title="跌停数据"
            />
            <el-empty v-else description="暂无数据" />
          </el-tab-pane>
          <el-tab-pane label="指数数据" name="indices-json">
            <json-display
              v-if="dataStore.indicesData"
              :data="dataStore.indicesData"
              title="指数数据"
            />
            <el-empty v-else description="暂无数据" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button @click="toggleFullscreen">
          <el-icon>
            <FullScreen v-if="!isFullscreen" />
            <Aim v-else />
          </el-icon>
          {{ isFullscreen ? '退出全屏' : '全屏显示' }}
        </el-button>
        <el-button type="primary" @click="jsonDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Document,
  FullScreen,
  Aim
} from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/dataStore'
import { DataType } from '@/services/dataService'
import StockDataTable from './StockDataTable.vue'
import JsonDisplay from './JsonDisplay.vue'
import LimitStockTable from './LimitStockTable.vue'
import IndexDataTable from './IndexDataTable.vue'
import dayjs from 'dayjs';

const dataStore = useDataStore()

// 响应式数据
const activeTab = ref('sse')
const _date = dayjs().hour() < 16 ? dayjs().subtract(1, 'day') : dayjs()
const selectedDate = ref(_date.toDate())
const jsonDialogVisible = ref(false)
const isFullscreen = ref(false)

// 方法
const disabledDate = (time: Date) => {
  // 禁用未来日期
  return time.getTime() > Date.now()
}

const handleDateChange = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0]
  dataStore.setCurrentDate(dateStr)
  loadTabData(activeTab.value)
}

const handleTabChange = (tabName: string | number) => {
  const tabNameStr = String(tabName)
  activeTab.value = tabNameStr
  loadTabData(tabNameStr)
}

const loadTabData = async (tabName: string) => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]

  switch (tabName) {
    case 'sse':
      await dataStore.fetchData(DataType.SSE, dateStr)
      break
    case 'szse':
      await dataStore.fetchData(DataType.SZSE, dateStr)
      break
    case 'limitup':
      await dataStore.fetchData(DataType.LIMIT_UP, dateStr)
      break
    case 'limitdown':
      await dataStore.fetchData(DataType.LIMIT_DOWN, dateStr)
      break
    case 'indices':
      await dataStore.fetchData(DataType.INDICES, dateStr)
      break
  }
}

const refreshAllData = async () => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  try {
    await dataStore.fetchAllData(dateStr)
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  }
}

const showJsonDisplay = () => {
  jsonDialogVisible.value = true
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 生命周期
onMounted(async () => {
  const dateStr = selectedDate.value.toISOString().split('T')[0]
  dataStore.setCurrentDate(dateStr)
  await loadTabData(activeTab.value)
})

// 监听错误信息
watch(() => dataStore.error, (error) => {
  if (error) {
    ElMessage.error(error)
    dataStore.clearError()
  }
})
</script>

<style lang="scss" scoped>
.data-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;

  .header-left {
    display: flex;
    align-items: center;

    h2 {
      margin: 0;
      color: #303133;
      font-weight: 600;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.generation-panel-section {
  padding: 0 20px;
  margin-bottom: 20px;
}

.statistics-cards {
  padding: 20px;
  background: #f5f5f5;

  .stat-card {
    text-align: center;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :deep(.el-statistic__head) {
      font-size: 14px;
      color: #606266;
      margin-bottom: 8px;
    }

    :deep(.el-statistic__content) {
      font-size: 24px;
      font-weight: bold;
      color: #409eff;
    }
  }
}

.viewer-content {
  flex: 1;
  padding: 0 20px 20px;
  overflow: hidden;

  .tab-label {
    display: flex;
    align-items: center;
    gap: 8px;

    .el-badge {
      :deep(.el-badge__content) {
        font-size: 10px;
        height: 16px;
        line-height: 16px;
        padding: 0 4px;
      }
    }
  }

  .tab-content {
    min-height: 400px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;

    .el-tabs__header {
      margin: 0;
      background: #fff;
      border-radius: 8px 8px 0 0;
    }

    .el-tabs__content {
      flex: 1;
      overflow: hidden;
    }
  }
}

.json-dialog {
  :deep(.el-dialog) {
    &.is-fullscreen {
      .el-dialog__body {
        padding: 10px;
        max-height: calc(100vh - 120px);
      }
    }
  }

  .json-dialog-content {
    height: 60vh;
    min-height: 400px;

    :deep(.el-tabs) {
      height: 100%;
      display: flex;
      flex-direction: column;

      .el-tabs__content {
        flex: 1;
        overflow: hidden;
      }

      .el-tab-pane {
        height: 100%;
        overflow: auto;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .statistics-cards {
    .el-col {
      margin-bottom: 16px;
    }
  }
}

@media (max-width: 768px) {
  .viewer-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .header-left,
    .header-right {
      justify-content: center;
    }
  }

  .statistics-cards {
    padding: 16px;

    .stat-card {
      :deep(.el-statistic__content) {
        font-size: 20px;
      }
    }
  }

  .viewer-content {
    padding: 0 16px 16px;
  }
}

// 深色主题支持
@media (prefers-color-scheme: dark) {
  .data-viewer {
    background: #1a202c;
  }

  .viewer-header {
    background: #2d3748;
    border-color: #4a5568;

    h2 {
      color: #e2e8f0;
    }
  }

  .statistics-cards {
    background: #1a202c;

    .stat-card {
      background: #2d3748;
      border-color: #4a5568;

      :deep(.el-statistic__head) {
        color: #a0aec0;
      }

      :deep(.el-statistic__content) {
        color: #63b3ed;
      }
    }
  }

  .viewer-content {
    .tab-content {
      background: #2d3748;
    }
  }
}
</style>