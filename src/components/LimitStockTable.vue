<template>
  <div class="limit-stock-table">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索股票代码或名称..."
          clearable
          style="width: 250px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="sortBy"
          placeholder="排序字段"
          style="width: 120px; margin-left: 10px"
          @change="handleSort"
        >
          <el-option label="排名" value="rank" />
          <el-option label="涨跌幅" value="actualChangeRate" />
          <el-option label="成交额" value="amount" />
          <el-option label="振幅" value="amp_rate" />
          <el-option label="股票代码" value="code" />
        </el-select>

        <el-select
          v-model="sortOrder"
          placeholder="排序方式"
          style="width: 100px; margin-left: 10px"
          @change="handleSort"
        >
          <el-option label="升序" value="asc" />
          <el-option label="降序" value="desc" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button size="small" @click="exportToCSV">
          <el-icon><Download /></el-icon>
          导出 CSV
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="statistics">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="股票总数" :value="filteredData.length" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="主板股票" :value="mainBoardCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="创业板股票" :value="growthBoardCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均涨跌幅" :value="averageChangeRate" :precision="2" suffix="%" />
        </el-col>
      </el-row>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        :data="paginatedData"
        v-loading="loading"
        height="400"
        stripe
        border
        size="small"
        @sort-change="handleTableSort"
      >
        <el-table-column type="index" width="50" label="#" />

        <el-table-column prop="rank" label="排名" width="60" sortable="custom" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getRankTagType(row.rank)"
              size="small"
              effect="dark"
            >
              {{ row.rank }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="code" label="代码" width="80" sortable="custom">
          <template #default="{ row }">
            <el-link type="primary" @click="showStockDetail(row)">
              {{ row.code }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="名称" width="120" sortable="custom" />

        <el-table-column prop="exchange" label="交易所" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.exchange === 'SSE' ? 'primary' : 'success'" size="small">
              {{ row.exchange }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="boardType" label="板块" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">
              {{ row.boardType }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="prevClose" label="昨收价" width="80" align="right">
          <template #default="{ row }">
            {{ row.prevClose?.toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column prop="last" label="最新价" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <span :class="getPriceClass(row.actualChangeRate)">
              {{ row.last?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="limitThreshold" label="涨停价" width="80" align="right">
          <template #default="{ row }">
            <span class="limit-price">
              {{ row.limitThreshold?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="change" label="涨跌额" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <span :class="getPriceClass(row.change)">
              {{ row.change?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="actualChangeRate" label="涨跌幅" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <el-tag :type="getChangeRateTagType(row.actualChangeRate)" size="small">
              {{ row.actualChangeRate?.toFixed(2) }}%
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="amp_rate" label="振幅" width="70" sortable="custom" align="right">
          <template #default="{ row }">
            {{ row.amp_rate?.toFixed(2) }}%
          </template>
        </el-table-column>

        <el-table-column prop="volume" label="成交量" width="100" sortable="custom" align="right">
          <template #default="{ row }">
            {{ formatVolume(row.volume) }}
          </template>
        </el-table-column>

        <el-table-column prop="amount" label="成交额" width="100" sortable="custom" align="right">
          <template #default="{ row }">
            {{ formatAmount(row.amount) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="text" @click="showStockDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="filteredData.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handlePageSizeChange"
          @current-change="handleCurrentPageChange"
        />
      </div>
    </div>

    <!-- 股票详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="`涨停股票详情 - ${selectedStock?.name} (${selectedStock?.code})`"
      width="600px"
    >
      <div v-if="selectedStock" class="stock-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="排名">
            <el-tag :type="getRankTagType(selectedStock.rank)" effect="dark">
              {{ selectedStock.rank }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="交易所">
            <el-tag :type="selectedStock.exchange === 'SSE' ? 'primary' : 'success'">
              {{ selectedStock.exchange }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="股票代码">
            {{ selectedStock.code }}
          </el-descriptions-item>
          <el-descriptions-item label="股票名称">
            {{ selectedStock.name }}
          </el-descriptions-item>
          <el-descriptions-item label="板块类型">
            {{ selectedStock.boardType }}
          </el-descriptions-item>
          <el-descriptions-item label="昨收价">
            {{ selectedStock.prevClose?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最新价">
            <span :class="getPriceClass(selectedStock.actualChangeRate)">
              {{ selectedStock.last?.toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨停价">
            <span class="limit-price">
              {{ selectedStock.limitThreshold?.toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌额">
            <span :class="getPriceClass(selectedStock.change)">
              {{ selectedStock.change?.toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌幅">
            <el-tag :type="getChangeRateTagType(selectedStock.actualChangeRate)">
              {{ selectedStock.actualChangeRate?.toFixed(2) }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="涨停阈值">
            {{ (selectedStock.limitRate * 100).toFixed(1) }}%
          </el-descriptions-item>
          <el-descriptions-item label="振幅">
            {{ selectedStock.amp_rate?.toFixed(2) }}%
          </el-descriptions-item>
          <el-descriptions-item label="开盘价">
            {{ selectedStock.open?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最高价">
            {{ selectedStock.high?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最低价">
            {{ selectedStock.low?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="成交量">
            {{ formatVolume(selectedStock.volume) }}
          </el-descriptions-item>
          <el-descriptions-item label="成交额">
            {{ formatAmount(selectedStock.amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="交易阶段">
            {{ selectedStock.tradephase }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Download
} from '@element-plus/icons-vue'
import type { LimitStockData } from '@/services/dataService'

// Props 定义
interface Props {
  data: LimitStockData[]
  loading?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  title: '涨停股票'
})

// 响应式数据
const searchKeyword = ref('')
const sortBy = ref('rank')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const pageSize = ref(20)
const detailVisible = ref(false)
const selectedStock = ref<LimitStockData | null>(null)

// 计算属性
const filteredData = computed(() => {
  let result = [...props.data]

  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(stock =>
      stock.code.toLowerCase().includes(keyword) ||
      stock.name.toLowerCase().includes(keyword)
    )
  }

  // 排序
  if (sortBy.value) {
    result.sort((a, b) => {
      let valueA = a[sortBy.value as keyof LimitStockData]
      let valueB = b[sortBy.value as keyof LimitStockData]

      // 处理 null/undefined
      if (valueA === null || valueA === undefined) valueA = 0
      if (valueB === null || valueB === undefined) valueB = 0

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortOrder.value === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      }

      return sortOrder.value === 'asc'
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number)
    })
  }

  return result
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

const mainBoardCount = computed(() => {
  return props.data.filter(stock => stock.boardType === '主板').length
})

const growthBoardCount = computed(() => {
  return props.data.filter(stock => stock.boardType === '创业板').length
})

const averageChangeRate = computed(() => {
  if (filteredData.value.length === 0) return 0
  const total = filteredData.value.reduce((sum, stock) => sum + (stock.actualChangeRate || 0), 0)
  return total / filteredData.value.length
})

// 方法
const getRankTagType = (rank: number) => {
  if (rank === 1) return 'danger'
  if (rank <= 3) return 'warning'
  if (rank <= 10) return 'success'
  return 'info'
}

const getPriceClass = (changeRate: number | null | undefined) => {
  if (!changeRate) return 'price-flat'
  return changeRate > 0 ? 'price-up' : changeRate < 0 ? 'price-down' : 'price-flat'
}

const getChangeRateTagType = (changeRate: number | null | undefined) => {
  if (!changeRate) return 'info'
  if (changeRate > 0) return 'danger'
  if (changeRate < 0) return 'success'
  return 'info'
}

const formatVolume = (volume: number | null | undefined) => {
  if (!volume) return '0'
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`
  }
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`
  }
  return volume.toString()
}

const formatAmount = (amount: number | null | undefined) => {
  if (!amount) return '0'
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)}亿`
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`
  }
  return amount.toFixed(2)
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleSort = () => {
  currentPage.value = 1
}

const handleTableSort = ({ prop, order }: { prop: string; order: string | null }) => {
  if (prop) {
    sortBy.value = prop
    sortOrder.value = order === 'ascending' ? 'asc' : 'desc'
  }
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentPageChange = (page: number) => {
  currentPage.value = page
}

const showStockDetail = (stock: LimitStockData) => {
  selectedStock.value = stock
  detailVisible.value = true
}

const exportToCSV = () => {
  try {
    const headers = [
      '排名', '代码', '名称', '交易所', '板块', '昨收价', '最新价', '涨停价',
      '涨跌额', '涨跌幅(%)', '振幅(%)', '成交量', '成交额', '开盘价', '最高价', '最低价'
    ]

    const rows = filteredData.value.map(stock => [
      stock.rank?.toString() || '',
      stock.code,
      stock.name,
      stock.exchange,
      stock.boardType,
      stock.prevClose?.toFixed(2) || '',
      stock.last?.toFixed(2) || '',
      stock.limitThreshold?.toFixed(2) || '',
      stock.change?.toFixed(2) || '',
      stock.actualChangeRate?.toFixed(2) || '',
      stock.amp_rate?.toFixed(2) || '',
      stock.volume?.toString() || '',
      stock.amount?.toFixed(2) || '',
      stock.open?.toFixed(2) || '',
      stock.high?.toFixed(2) || '',
      stock.low?.toFixed(2) || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${props.title}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    ElMessage.success('CSV 文件导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 监听数据变化，重置分页
watch(() => props.data, () => {
  currentPage.value = 1
}, { immediate: true })
</script>

<style lang="scss" scoped>
.limit-stock-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;

  .toolbar-left {
    display: flex;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.statistics {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e9ecef;
}

.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .el-table {
    flex: 1;
  }

  .pagination {
    padding: 16px;
    display: flex;
    justify-content: center;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
  }
}

.stock-detail {
  .el-descriptions {
    :deep(.el-descriptions__body) {
      .el-descriptions__table {
        .el-descriptions__cell {
          &.is-bordered-label {
            background: #f8f9fa;
            font-weight: 600;
          }
        }
      }
    }
  }
}

// 价格和涨停价样式
.price-up {
  color: #f56c6c;
  font-weight: bold;
}

.price-down {
  color: #67c23a;
  font-weight: bold;
}

.limit-price {
  color: #e6a23c;
  font-weight: bold;
}

// 深色主题支持
@media (prefers-color-scheme: dark) {
  .limit-stock-table {
    .toolbar,
    .pagination {
      background: #2d3748;
      border-color: #4a5568;
    }

    .statistics {
      background: #1a202c;
      border-color: #4a5568;
    }
  }
}
</style>