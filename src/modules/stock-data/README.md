# 股票数据模块 (Stock Data Module)

一个功能完整的股票数据获取与处理模块，支持多数据源、缓存机制、错误处理和实时数据订阅。

## 功能特性

- 🏢 **多数据源支持**: 东方财富、上交所(SSE)、深交所(SZSE)
- 🚀 **智能降级**: 主数据源失败时自动切换备用数据源
- 💾 **多层缓存**: 内存 + localStorage + IndexedDB 缓存策略
- 🔄 **实时订阅**: 支持数据实时更新订阅
- 🛡️ **错误处理**: 完善的错误分类和重试机制
- 📊 **数据验证**: 完整的数据完整性和有效性检查
- 🌐 **浏览器友好**: 专为前端环境优化
- 📦 **TypeScript**: 完整的类型定义支持

## 安装使用

### 1. 复制模块文件

将整个 `stock-data` 目录复制到你的项目中：

```bash
# 复制到你的项目的 src/modules/ 目录下
cp -r stock-data /path/to/your/project/src/modules/
```

### 2. 基本使用

#### 最简单的使用方式

```typescript
import {
  getAllStocks,
  getIndices,
  getLimitUpStocks,
  getLimitDownStocks,
  getMarketStatistics
} from '@/modules/stock-data'

// 获取所有股票数据
const stocks = await getAllStocks()
console.log('股票数据:', stocks)

// 获取指数数据
const indices = await getIndices()
console.log('指数数据:', indices)

// 获取涨停股票
const limitUp = await getLimitUpStocks()
console.log('涨停股票:', limitUp)

// 获取跌停股票
const limitDown = await getLimitDownStocks()
console.log('跌停股票:', limitDown)

// 获取市场统计
const stats = await getMarketStatistics()
console.log('市场统计:', stats)
```

#### 指定交易所获取股票

```typescript
import { getSSEStocks, getSZSEStocks } from '@/modules/stock-data'

// 获取上交所股票
const sseStocks = await getSSEStocks()
console.log('上交所股票:', sseStocks)

// 获取深交所股票
const szseStocks = await getSZSEStocks()
console.log('深交所股票:', szseStocks)
```

### 3. 高级使用

#### 使用模块类

```typescript
import { StockDataModule } from '@/modules/stock-data'

// 创建模块实例（可自定义配置）
const stockModule = new StockDataModule({
  debug: true,
  services: {
    dataService: {
      cache: {
        ttl: 10 * 60 * 1000, // 缓存10分钟
        maxEntries: 500
      }
    }
  }
})

// 使用模块方法
const stocks = await stockModule.getStockData({
  exchange: 'ALL',
  forceRefresh: true
})

const indices = await stockModule.getIndexData()

// 获取服务状态
const status = stockModule.getStatus()
console.log('服务状态:', status)
```

#### 使用数据服务类

```typescript
import { createStockDataService, DataSourceType } from '@/modules/stock-data'

// 创建自定义配置的数据服务
const dataService = createStockDataService({
  sources: {
    primary: DataSourceType.SSE, // 设置主数据源为上交所
    fallback: [DataSourceType.EASTMONEY, DataSourceType.SZSE]
  },
  debug: true
})

// 获取股票数据
const stocks = await dataService.getStockData({
  exchange: 'SSE',
  timeout: 15000
})
```

### 4. 批量数据获取

```typescript
import { getBatchData, DataType } from '@/modules/stock-data'

// 批量获取多种数据
const results = await getBatchData([
  { type: DataType.SSE },
  { type: DataType.SZSE },
  { type: DataType.INDICES },
  { type: DataType.LIMIT_UP },
  { type: DataType.LIMIT_DOWN }
], {
  concurrency: 2, // 并发数
  continueOnError: true
})

console.log('批量获取结果:', results)
```

### 5. 数据订阅

```typescript
import { subscribeDataUpdate, DataType } from '@/modules/stock-data'

// 订阅股票数据更新
const unsubscribe = subscribeDataUpdate(DataType.SSE, {
  interval: 30000, // 30秒更新一次
  onDataChange: (data) => {
    console.log('股票数据更新:', data)
    // 在这里更新UI状态
  },
  onError: (error) => {
    console.error('数据订阅错误:', error)
  }
})

// 取消订阅
// unsubscribe()
```

## 配置选项

### 默认配置

```typescript
import { DEFAULT_CONFIG } from '@/modules/stock-data'

console.log(DEFAULT_CONFIG)
```

### 自定义配置

```typescript
import { createStockDataModule } from '@/modules/stock-data'

const customModule = createStockDataModule({
  enabled: true,
  debug: false,

  services: {
    dataService: {
      cache: {
        enabled: true,
        ttl: 30 * 60 * 1000, // 30分钟
        storage: 'localStorage',
        keyPrefix: 'stock_data_',
        maxEntries: 1000
      },

      apiService: {
        baseURL: '',
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    }
  },

  sources: {
    primary: DataSourceType.EASTMONEY,
    fallback: [DataSourceType.SSE, DataSourceType.SZSE]
  }
})
```

## 数据类型

### 股票数据 (StockData)

```typescript
interface StockData {
  code: string           // 股票代码
  name: string           // 股票名称
  price: number          // 当前价格
  change: number         // 涨跌额
  changePercent: number  // 涨跌幅
  volume: number         // 成交量
  amount: number         // 成交额
  high: number          // 最高价
  low: number           // 最低价
  open: number          // 开盘价
  prevClose: number     // 昨收价
  timestamp: number     // 时间戳
  exchange: string      // 交易所
  market: string        // 市场
  amplitude: number     // 振幅
  turnoverRate?: number // 换手率
  pe?: number          // 市盈率
  pb?: number          // 市净率
}
```

### 指数数据 (IndexData)

```typescript
interface IndexData {
  code: string          // 指数代码
  name: string          // 指数名称
  price: number         // 当前点位
  change: number        // 涨跌点
  changePercent: number // 涨跌幅
  volume: number        // 成交量
  amount: number        // 成交额
  high: number         // 最高点
  low: number          // 最低点
  open: number         // 开盘点
  prevClose: number    // 昨收点
  timestamp: number    // 时间戳
}
```

### 市场统计 (MarketStats)

```typescript
interface MarketStats {
  totalStocks: number           // 总股票数
  limitUp: number             // 涨停股票数
  limitDown: number           // 跌停股票数
  upStocks: number            // 上涨股票数
  downStocks: number          // 下跌股票数
  flatStocks: number          // 平盘股票数
  totalVolume: number         // 总成交量
  totalAmount: number         // 总成交额
  timestamp: number           // 统计时间
  marketStatus: string        // 市场状态
}
```

## API 参考

### 数据类型枚举

```typescript
enum DataType {
  SSE = 'sse',           // 上交所数据
  SZSE = 'szse',         // 深交所数据
  INDICES = 'indices',    // 指数数据
  LIMIT_UP = 'limit_up',  // 涨停数据
  LIMIT_DOWN = 'limit_down' // 跌停数据
}

enum DataSourceType {
  EASTMONEY = 'eastmoney', // 东方财富
  SSE = 'sse',             // 上交所
  SZSE = 'szse'            // 深交所
}
```

### 主要类

#### StockDataModule

主要的模块类，提供完整的股票数据功能。

```typescript
class StockDataModule {
  constructor(config?: Partial<typeof DEFAULT_CONFIG>)

  getStockData(options: GetStockDataOptions): Promise<StockData[]>
  getIndexData(options?: GetDataOptions): Promise<IndexData[]>
  getLimitUpData(options?: GetDataOptions): Promise<StockData[]>
  getLimitDownData(options?: GetDataOptions): Promise<StockData[]>
  getMarketStats(options?: GetDataOptions): Promise<MarketStats>
  batchGetData(requests: BatchRequest[], options?: BatchGetDataOptions): Promise<any[]>
  subscribe(type: DataType, options: SubscribeOptions): () => void
  getStatus(): ServiceStatus
  clearCache(pattern?: string): Promise<void>
}
```

#### StockDataService

核心数据服务类，提供底层数据操作。

```typescript
class StockDataService {
  constructor(sources?: SourcesConfig, apiService?: ApiService, cacheService?: CacheService)

  // 数据获取方法
  getStockData(options: GetStockDataOptions): Promise<StockData[]>
  getIndexData(options?: GetDataOptions): Promise<IndexData[]>
  // ... 其他方法
}
```

### 工具函数

```typescript
// 日期工具
import { isTradingDay, formatDate, getPreviousTradingDay } from '@/modules/stock-data'

const today = new Date()
const isTrading = isTradingDay(today)
const formattedDate = formatDate(today, 'YYYY-MM-DD')
const prevTradingDay = getPreviousTradingDay(today)

// 数据验证
import { validateStockData, validateIndexData } from '@/modules/stock-data'

const isValidStock = validateStockData(stockData)
const isValidIndex = validateIndexData(indexData)
```

## 错误处理

模块提供完善的错误处理机制：

```typescript
import { ErrorType, getBatchData } from '@/modules/stock-data'

try {
  const data = await getBatchData([
    { type: DataType.SSE }
  ])
} catch (error) {
  if (error.type === ErrorType.NETWORK_ERROR) {
    console.error('网络错误:', error.message)
  } else if (error.type === ErrorType.DATA_PARSING_ERROR) {
    console.error('数据解析错误:', error.message)
  } else if (error.type === ErrorType.RATE_LIMIT_ERROR) {
    console.error('请求频率限制:', error.message)
  }
}
```

## 缓存机制

模块支持多层缓存策略：

1. **内存缓存**: 最快的访问速度，页面刷新后丢失
2. **localStorage**: 持久化存储，容量限制~5MB
3. **IndexedDB**: 大容量存储，支持复杂查询

```typescript
import { createStockDataModule } from '@/modules/stock-data'

// 自定义缓存配置
const module = createStockDataModule({
  services: {
    dataService: {
      cache: {
        ttl: 60 * 60 * 1000,    // 缓存1小时
        maxEntries: 2000,       // 最大缓存条目
        storage: 'localStorage' // 存储方式
      }
    }
  }
})

// 清除缓存
await module.clearCache('stock_data_*') // 清除匹配模式的缓存
await module.clearCache() // 清除所有缓存
```

## 性能优化

### 1. 数据源优化

```typescript
// 优先使用最快的东方财富数据源
const module = createStockDataModule({
  sources: {
    primary: DataSourceType.EASTMONEY,
    fallback: [DataSourceType.SSE, DataSourceType.SZSE]
  }
})
```

### 2. 批量请求

```typescript
// 使用批量请求减少网络开销
const results = await getBatchData([
  { type: DataType.SSE },
  { type: DataType.SZSE }
], {
  concurrency: 3,
  continueOnError: true
})
```

### 3. 合理的缓存策略

```typescript
// 根据数据更新频率设置不同的缓存时间
const module = createStockDataModule({
  services: {
    dataService: {
      cache: {
        ttl: 5 * 60 * 1000 // 实时数据缓存5分钟
      }
    }
  }
})
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 依赖项

模块没有外部依赖，只需要现代浏览器环境支持：
- ES2015+ JavaScript
- Fetch API
- localStorage / IndexedDB
- URL / URLSearchParams

## 开发和调试

### 启用调试模式

```typescript
const module = createStockDataModule({
  debug: true
})
```

调试模式下会输出详细的请求日志、错误信息和性能指标。

### 查看服务状态

```typescript
const status = module.getStatus()
console.log('数据源状态:', status.sources)
console.log('缓存统计:', status.cache)
console.log('请求统计:', status.statistics)
```

## 示例项目

### Vue 3 组件示例

```vue
<template>
  <div class="stock-data">
    <h2>股票数据</h2>
    <div v-if="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="stats">
        <p>涨停: {{ stats.limitUp }} 跌停: {{ stats.limitDown }}</p>
        <p>上涨: {{ stats.upStocks }} 下跌: {{ stats.downStocks }}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>代码</th>
            <th>名称</th>
            <th>价格</th>
            <th>涨跌幅</th>
            <th>成交量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in stocks" :key="stock.code">
            <td>{{ stock.code }}</td>
            <td>{{ stock.name }}</td>
            <td>{{ stock.price }}</td>
            <td :class="getChangeClass(stock.changePercent)">
              {{ stock.changePercent }}%
            </td>
            <td>{{ formatVolume(stock.volume) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  getAllStocks,
  getMarketStatistics,
  subscribeDataUpdate,
  DataType
} from '@/modules/stock-data'
import type { StockData, MarketStats } from '@/modules/stock-data'

const stocks = ref<StockData[]>([])
const stats = ref<MarketStats>()
const loading = ref(false)
const error = ref('')

let unsubscribe: (() => void) | null = null

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const [stocksData, statsData] = await Promise.all([
      getAllStocks(),
      getMarketStatistics()
    ])

    stocks.value = stocksData.slice(0, 50) // 只显示前50条
    stats.value = statsData
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const getChangeClass = (change: number) => {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'flat'
}

const formatVolume = (volume: number) => {
  if (volume > 100000000) {
    return (volume / 100000000).toFixed(2) + '亿'
  }
  if (volume > 10000) {
    return (volume / 10000).toFixed(2) + '万'
  }
  return volume.toString()
}

onMounted(async () => {
  await loadData()

  // 订阅数据更新
  unsubscribe = subscribeDataUpdate(DataType.SSE, {
    interval: 30000, // 30秒更新一次
    onDataChange: async () => {
      await loadData()
    },
    onError: (err) => {
      console.error('数据更新失败:', err)
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<style scoped>
.up { color: red; }
.down { color: green; }
.flat { color: gray; }
.error { color: red; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; }
.stats { margin-bottom: 20px; }
</style>
```

## 许可证

MIT License

## 更新日志

### v1.0.0
- 初始版本发布
- 支持三大数据源：东方财富、上交所、深交所
- 实现多层缓存机制
- 提供完整的TypeScript类型定义
- 支持实时数据订阅
- 完善的错误处理和重试机制