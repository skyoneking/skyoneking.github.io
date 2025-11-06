<template>
  <div class="index-data-table">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索指数代码或名称..."
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
          <el-option label="涨跌幅" value="chg_rate" />
          <el-option label="成交额" value="amount" />
          <el-option label="成交量" value="volume" />
          <el-option label="市值" value="market_cap" />
          <el-option label="指数代码" value="code" />
        </el-select>

        <el-select
          v-model="sortOrder"
          placeholder="排序方式"
          style="width: 100px; margin-left: 10px"
          @change="handleSort"
        >
          <el-option label="降序" value="desc" />
          <el-option label="升序" value="asc" />
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
          <el-statistic title="指数总数" :value="filteredData.length" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="上涨指数" :value="upCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="下跌指数" :value="downCount" />
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

        <el-table-column prop="code" label="代码" width="80" sortable="custom">
          <template #default="{ row }">
            <el-link type="primary" @click="showIndexDetail(row)">
              {{ row.code }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="名称" width="120" sortable="custom" />

        <el-table-column prop="market" label="市场" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.market === '上海' ? 'primary' : 'success'" size="small">
              {{ row.market }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="last" label="最新价" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <span :class="getPriceClass(row.chg_rate)">
              {{ row.last?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="change" label="涨跌额" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <span :class="getPriceClass(row.chg_rate)">
              {{ row.change?.toFixed(2) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="chg_rate" label="涨跌幅" width="80" sortable="custom" align="right">
          <template #default="{ row }">
            <el-tag
              :type="getChangeRateTagType(row.chg_rate)"
              size="small"
            >
              {{ row.chg_rate?.toFixed(2) }}%
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="open" label="开盘价" width="80" align="right">
          <template #default="{ row }">
            {{ row.open?.toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column prop="high" label="最高价" width="80" align="right">
          <template #default="{ row }">
            {{ row.high?.toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column prop="low" label="最低价" width="80" align="right">
          <template #default="{ row }">
            {{ row.low?.toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column prop="prev_close" label="昨收价" width="80" align="right">
          <template #default="{ row }">
            {{ row.prev_close?.toFixed(2) }}
          </template>
        </el-table-column>

        <el-table-column prop="amp_rate" label="振幅" width="70" align="right">
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

        <el-table-column prop="market_cap" label="总市值" width="100" sortable="custom" align="right">
          <template #default="{ row }">
            {{ formatAmount(Number(row.market_cap)) }}
          </template>
        </el-table-column>

        <el-table-column prop="pe" label="市盈率" width="70" align="right">
          <template #default="{ row }">
            {{ row.pe?.toFixed(2) || '--' }}
          </template>
        </el-table-column>

        <el-table-column prop="pb" label="市净率" width="70" align="right">
          <template #default="{ row }">
            {{ row.pb?.toFixed(2) || '--' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="text" @click="showIndexDetail(row)">
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

    <!-- 指数详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      :title="`指数详情 - ${selectedIndex?.name} (${selectedIndex?.code})`"
      width="700px"
    >
      <div v-if="selectedIndex" class="index-detail">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="指数代码">
            {{ selectedIndex.code }}
          </el-descriptions-item>
          <el-descriptions-item label="指数名称">
            {{ selectedIndex.name }}
          </el-descriptions-item>
          <el-descriptions-item label="所属市场">
            <el-tag :type="selectedIndex.market === '上海' ? 'primary' : 'success'">
              {{ selectedIndex.market }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最新价">
            <span :class="getPriceClass(selectedIndex.chg_rate)">
              {{ selectedIndex.last?.toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌额">
            <span :class="getPriceClass(selectedIndex.chg_rate)">
              {{ selectedIndex.change?.toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="涨跌幅">
            <el-tag :type="getChangeRateTagType(selectedIndex.chg_rate)">
              {{ selectedIndex.chg_rate?.toFixed(2) }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开盘价">
            {{ selectedIndex.open?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最高价">
            {{ selectedIndex.high?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最低价">
            {{ selectedIndex.low?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="昨收价">
            {{ selectedIndex.prev_close?.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="振幅">
            {{ selectedIndex.amp_rate?.toFixed(2) }}%
          </el-descriptions-item>
          <el-descriptions-item label="成交量">
            {{ formatVolume(selectedIndex.volume) }}
          </el-descriptions-item>
          <el-descriptions-item label="成交额">
            {{ formatAmount(selectedIndex.amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="总市值">
            {{ formatAmount(Number(selectedIndex.market_cap)) }}
          </el-descriptions-item>
          <el-descriptions-item label="市盈率">
            {{ selectedIndex.pe?.toFixed(2) || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="市净率">
            {{ selectedIndex.pb?.toFixed(2) || '--' }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="3">
            {{ selectedIndex.update_time }}
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
import type { IndexData } from '@/services/dataService'

// Props 定义
interface Props {
  data: IndexData[]
  loading?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  title: '指数数据'
})

// 响应式数据
const searchKeyword = ref('')
const sortBy = ref('chg_rate')
const sortOrder = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref(50)
const detailVisible = ref(false)
const selectedIndex = ref<IndexData | null>(null)

// 计算属性
const filteredData = computed(() => {
  let result = [...props.data]

  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(index =>
      index.code.toLowerCase().includes(keyword) ||
      index.name.toLowerCase().includes(keyword)
    )
  }

  // 排序
  if (sortBy.value) {
    result.sort((a, b) => {
      let valueA = a[sortBy.value as keyof IndexData]
      let valueB = b[sortBy.value as keyof IndexData]

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

const averageChangeRate = computed(() => {
  if (filteredData.value.length === 0) return 0
  const total = filteredData.value.reduce((sum, index) => sum + (index.chg_rate || 0), 0)
  return total / filteredData.value.length
})

const upCount = computed(() => {
  return filteredData.value.filter(index => (index.chg_rate || 0) > 0).length
})

const downCount = computed(() => {
  return filteredData.value.filter(index => (index.chg_rate || 0) < 0).length
})

// 方法
const getPriceClass = (chgRate: number | null | undefined) => {
  if (!chgRate) return ''
  return chgRate > 0 ? 'price-up' : chgRate < 0 ? 'price-down' : 'price-flat'
}

const getChangeRateTagType = (chgRate: number | null | undefined) => {
  if (!chgRate) return 'info'
  if (chgRate > 0) return 'success'
  if (chgRate < 0) return 'danger'
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

const showIndexDetail = (index: IndexData) => {
  selectedIndex.value = index
  detailVisible.value = true
}

const exportToCSV = () => {
  try {
    const headers = [
      '代码', '名称', '市场', '最新价', '涨跌额', '涨跌幅(%)', '开盘价', '最高价', '最低价',
      '昨收价', '振幅(%)', '成交量', '成交额', '总市值', '市盈率', '市净率', '更新时间'
    ]

    const rows = filteredData.value.map(index => [
      index.code,
      index.name,
      index.market,
      index.last?.toFixed(2) || '',
      index.change?.toFixed(2) || '',
      index.chg_rate?.toFixed(2) || '',
      index.open?.toFixed(2) || '',
      index.high?.toFixed(2) || '',
      index.low?.toFixed(2) || '',
      index.prev_close?.toFixed(2) || '',
      index.amp_rate?.toFixed(2) || '',
      index.volume?.toString() || '',
      index.amount?.toFixed(2) || '',
      index.market_cap?.toFixed(2) || '',
      index.pe?.toFixed(2) || '',
      index.pb?.toFixed(2) || '',
      index.update_time || ''
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
.index-data-table {
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

.index-detail {
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

// 价格颜色样式
.price-up {
  color: #f56c6c;
  font-weight: bold;
}

.price-down {
  color: #67c23a;
  font-weight: bold;
}

.price-flat {
  color: #909399;
}

// 深色主题支持
@media (prefers-color-scheme: dark) {
  .index-data-table {
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