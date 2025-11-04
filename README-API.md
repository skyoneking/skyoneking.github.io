# 股票数据生成器 API

一个提供上交所和深交所股票数据获取、涨停板分析、炸板股分析等功能的Node.js编程接口。

## 安装

```bash
npm install
```

## 快速开始

```javascript
const StockDataGenerator = require('./src/index');

// 创建生成器实例
const generator = new StockDataGenerator();

// 生成完整数据（推荐用法）
const result = await generator.generateCompleteData('2024-01-15', {
  includeLimitUp: true,     // 生成涨停板天梯
  includeLimitDown: true,   // 生成炸板股列表
  saveToFile: true          // 保存到文件
});

if (result.success) {
  console.log(`涨停板: ${result.data.limitUp.totalCount} 只`);
  console.log(`炸板股: ${result.data.limitDown.totalCount} 只`);
}
```

## API 方法

### 主要方法

#### `generateCompleteData(date, options)` - 生成完整数据
生成指定日期的完整分析数据，这是推荐的入口方法。

**参数:**
- `date` (string): 日期字符串，格式 YYYY-MM-DD，默认为当前日期
- `options` (Object): 配置选项
  - `includeStockData` (boolean): 是否获取原始股票数据，默认 true
  - `includeLimitUp` (boolean): 是否生成涨停板天梯，默认 true
  - `includeLimitDown` (boolean): 是否生成炸板股列表，默认 true
  - `saveToFile` (boolean): 是否保存到文件，默认 true

**返回:**
```javascript
{
  success: true,
  data: {
    stockData: { sse: [...], szse: [...] },  // 原始股票数据
    limitUp: { totalCount: 50, stocks: [...] }, // 涨停板天梯
    limitDown: { totalCount: 20, stocks: [...] } // 炸板股列表
  },
  errors: [],
  metadata: {
    date: '2024-01-15',
    generatedAt: '2024-01-15 10:30:00'
  }
}
```

#### `generateLimitUpLadder(date, options)` - 生成涨停板天梯
生成指定日期的涨停板天梯数据。

**参数:**
- `date` (string): 日期字符串，格式 YYYY-MM-DD
- `options` (Object): 配置选项
  - `noSave` (boolean): 不保存到文件，默认 false

#### `generateExplodedList(date, options)` - 生成炸板股列表
生成指定日期的炸板股列表数据。

**参数:**
- `date` (string): 日期字符串，格式 YYYY-MM-DD
- `options` (Object): 配置选项
  - `noSave` (boolean): 不保存到文件，默认 false

### 数据获取方法

#### `fetchCurrentData(options)` - 获取当日股票数据
获取当日的股票数据。

#### `fetchDateData(date, options)` - 获取指定日期股票数据
获取指定日期的原始股票数据。

#### `fetchRangeData(startDate, endDate, options)` - 批量获取日期范围数据
批量获取指定日期范围的股票数据。

### 缓存管理方法

#### `getCacheStatus()` - 获取缓存状态
查看当前缓存文件状态。

#### `cleanExpiredCache(days)` - 清理过期缓存
清理指定天数之前的缓存文件。

**参数:**
- `days` (number): 保留天数，默认 30 天

#### `refreshData(date, options)` - 刷新缓存数据
重新获取并刷新指定日期的缓存数据。

## 使用示例

### 基本用法

```javascript
const StockDataGenerator = require('./src/index');
const generator = new StockDataGenerator();

// 生成炸板股列表
const explodedResult = await generator.generateExplodedList('2024-01-15');
console.log(`炸板股: ${explodedResult.data.totalCount} 只`);

// 生成涨停板天梯
const limitUpResult = await generator.generateLimitUpLadder('2024-01-15');
console.log(`涨停板: ${limitUpResult.data.totalCount} 只`);
```

### 高级用法

```javascript
// 只生成分析结果，不获取原始数据
const result = await generator.generateCompleteData('2024-01-15', {
  includeStockData: false,
  includeLimitUp: true,
  includeLimitDown: true,
  saveToFile: true
});

// 处理错误
if (!result.success) {
  console.error('生成失败:', result.errors);
  return;
}

// 使用数据
result.data.limitUp.stocks.forEach(stock => {
  console.log(`${stock.name} (${stock.code}) - 涨幅${stock.actualChangeRate}%`);
});
```

### 批量处理

```javascript
// 获取多日数据
const rangeResult = await generator.fetchRangeData('2024-01-01', '2024-01-07');

if (rangeResult.success) {
  console.log('批量获取成功');
  // 处理 rangeResult.data 中的数据
}
```

## 数据格式

### 涨停板天梯数据格式
```javascript
{
  "generateDate": "2024-01-15 10:30:00",
  "targetDate": "2024-01-15",
  "totalCount": 50,
  "mainBoardCount": 40,
  "growthBoardCount": 10,
  "calculationMethod": "price_based",
  "stocks": [
    {
      "rank": 1,
      "code": "600000",
      "name": "浦发银行",
      "exchange": "SSE",
      "boardType": "主板",
      "prevClose": 10.00,
      "last": 11.00,
      "limitThreshold": 11.00,
      "limitRate": 0.1,
      "actualChangeRate": 10.0,
      // ... 其他字段
    }
  ]
}
```

### 炸板股列表数据格式
```javascript
{
  "date": "2024-01-15",
  "generateTime": "2024-01-15 10:30:00",
  "totalCount": 20,
  "stocks": [
    {
      "code": "600000",
      "name": "浦发银行",
      "exchange": "SSE",
      "boardType": "主板",
      "prevClose": 10.00,
      "high": 11.00,
      "last": 10.50,
      "dropRate": 4.55,
      "dropAmount": 0.50,
      "explodedType": "轻微炸板"
    }
  ]
}
```

## 文件输出

数据文件保存在以下位置：
- 涨停板天梯: `data/limitup/YYYY-MM-DD.json`
- 炸板股列表: `data/limitdown/YYYY-MM-DD.json`
- 上交所原始数据: `data/sse/YYYY-MM-DD.json`
- 深交所原始数据: `data/szse/YYYY-MM-DD.json`

## 错误处理

所有方法都返回统一的结果对象，包含 `success`、`data`、`errors` 和 `metadata` 字段：

```javascript
const result = await generator.generateLimitUpLadder('2024-01-15');

if (result.success) {
  // 成功处理数据
  console.log(result.data);
} else {
  // 处理错误
  console.error('错误:', result.errors);
}
```

## 注意事项

1. 系统会自动创建必要的目录结构
2. 数据会自动缓存，避免重复请求
3. 新股和次新股已从涨停板分析中排除
4. 炸板股分析已排除停牌、ST股和北交所股票
5. 建议在生产环境中适当控制请求频率

## 版本信息

- 当前版本: 2.0.0
- Node.js 要求: >= 14.0.0