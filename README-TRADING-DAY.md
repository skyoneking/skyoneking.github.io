# 非交易日验证功能

本文档介绍了股票数据生成器的非交易日验证功能，该功能可以避免在非交易日（周末和节假日）进行无效的数据获取请求。

## 功能概述

### 🎯 主要特性

- **智能交易日检查**：自动检测指定日期是否为交易日
- **节假日数据支持**：集成中国A股节假日信息
- **灵活配置选项**：可选择启用或禁用交易日检查
- **友好的错误提示**：提供清晰的状态信息和建议
- **缓存机制**：节假日数据本地缓存，减少API请求
- **容错处理**：API失败时自动降级为基础判断

### 📅 支持的非交易日类型

1. **周末**：星期六、星期日
2. **法定节假日**：元旦、春节、清明节、劳动节、端午节、中秋节、国庆节等
3. **调休工作日**：因调休而正常上班的周末日（被视为交易日）

## 安装和依赖

确保已安装必要的依赖：

```bash
npm install axios moment
```

## 基本使用

### 检查交易日状态

```javascript
const StockDataGenerator = require('./src/index');

async function checkTradingDay() {
  const generator = new StockDataGenerator();

  // 检查指定日期是否为交易日
  const dateToCheck = '2025-11-08'; // 周六
  const result = await generator.getTradingDayStatus(dateToCheck);

  if (result.success) {
    const status = result.data;
    console.log(`${dateToCheck} 是${status.isTradingDay ? '交易日' : '非交易日'}`);
    console.log(`状态: ${status.reason}`);

    if (!status.isTradingDay) {
      console.log(`建议: ${status.suggestion}`);
    }
  }
}
```

### 获取最近交易日

```javascript
async function findRecentTradingDay() {
  const generator = new StockDataGenerator();

  // 查找最近的交易日
  const result = await generator.getRecentTradingDay('2025-11-08');

  if (result.success) {
    const data = result.data;
    console.log(`基准日期: ${data.baseDate}`);
    console.log(`最近交易日: ${data.recentTradingDay}`);
    console.log(`回溯天数: ${data.daysBack} 天`);
  }
}
```

### 数据获取（启用交易日检查）

```javascript
async function fetchWithTradingDayCheck() {
  const generator = new StockDataGenerator();

  // 尝试获取非交易日数据（默认会失败）
  const result = await generator.fetchDateData('2025-11-08');

  if (!result.success) {
    console.log('获取失败:', result.errors.join(', '));

    // 查看交易日状态信息
    if (result.metadata && result.metadata.tradingDayStatus) {
      const status = result.metadata.tradingDayStatus;
      console.log(`${status.date} 是${status.isTradingDay ? '交易日' : '非交易日'}`);
      console.log(`原因: ${status.reason}`);
      console.log(`建议: ${status.suggestion}`);
    }
  }
}
```

### 数据获取（禁用交易日检查）

```javascript
async function fetchWithoutTradingDayCheck() {
  const generator = new StockDataGenerator();

  // 禁用交易日检查
  const result = await generator.fetchDateData('2025-11-08', {
    checkTradingDay: false
  });

  if (result.success) {
    console.log('数据获取成功（忽略交易日检查）');
    console.log(`上交所数据: ${result.data.sse ? result.data.sse.data.length : 0} 条`);
    console.log(`深交所数据: ${result.data.szse ? result.data.szse.data.length : 0} 条`);
  }
}
```

## API 参考

### StockDataGenerator 方法

#### `getTradingDayStatus(date, checkHolidays = true)`

检查指定日期的交易日状态。

**参数：**
- `date` (string): 日期字符串，格式 YYYY-MM-DD
- `checkHolidays` (boolean): 是否检查节假日，默认 true

**返回值：**
```javascript
{
  success: true,
  data: {
    isTradingDay: false,        // 是否为交易日
    date: "2025-11-08",         // 检查的日期
    status: "weekend",          // 状态类型: weekend, holiday, trading_day, invalid_date, error
    reason: "星期六",            // 详细原因
    suggestion: "请选择工作日获取数据"  // 建议
  },
  errors: [],
  metadata: {
    date: "2025-11-08",
    checkedAt: "2025-11-04 10:30:00"
  }
}
```

#### `getRecentTradingDay(baseDate = null, checkHolidays = true, maxDaysBack = 30)`

获取最近的交易日。

**参数：**
- `baseDate` (string): 基准日期，默认为当前日期
- `checkHolidays` (boolean): 是否检查节假日，默认 true
- `maxDaysBack` (number): 最大回溯天数，默认 30 天

**返回值：**
```javascript
{
  success: true,
  data: {
    baseDate: "2025-11-08",         // 基准日期
    recentTradingDay: "2025-11-07", // 最近交易日
    daysBack: 1                     // 回溯天数
  },
  errors: [],
  metadata: {
    foundAt: "2025-11-04 10:30:00"
  }
}
```

#### `fetchDateData(date, options = {})`

获取指定日期的股票数据（支持交易日检查）。

**参数：**
- `date` (string): 日期字符串，格式 YYYY-MM-DD
- `options` (object): 配置选项
  - `checkTradingDay` (boolean): 是否检查交易日，默认 true
  - `exchange` (string): 指定交易所，可选 'SSE' 或 'SZSE'
  - `noCache` (boolean): 是否禁用缓存，默认 false

**返回值：**
```javascript
{
  success: false,
  data: null,
  errors: ["2025-11-08 是非交易日: 星期六"],
  metadata: {
    date: "2025-11-08",
    fetchedAt: "2025-11-04 10:30:00",
    tradingDayStatus: {
      isTradingDay: false,
      reason: "星期六",
      suggestion: "请选择工作日获取数据"
    }
  }
}
```

## 配置选项

### 交易日检查控制

```javascript
// 默认启用交易日检查
const result1 = await generator.fetchDateData('2025-11-08');

// 显式启用交易日检查
const result2 = await generator.fetchDateData('2025-11-08', {
  checkTradingDay: true
});

// 禁用交易日检查
const result3 = await generator.fetchDateData('2025-11-08', {
  checkTradingDay: false
});
```

### 错误处理

非交易日验证功能提供了详细的错误信息：

```javascript
if (!result.success) {
  for (const error of result.errors) {
    console.log('错误:', error);
  }

  // 检查交易日状态
  if (result.metadata && result.metadata.tradingDayStatus) {
    const status = result.metadata.tradingDayStatus;
    console.log('日期:', status.date);
    console.log('状态:', status.status);
    console.log('原因:', status.reason);
    console.log('建议:', status.suggestion);
  }
}
```

## 最佳实践

### 1. 自动选择交易日

```javascript
async function smartDataFetch() {
  const generator = new StockDataGenerator();
  const targetDate = '2025-11-08'; // 可能是非交易日

  // 检查是否为交易日
  const statusResult = await generator.getTradingDayStatus(targetDate);

  if (statusResult.success && statusResult.data.isTradingDay) {
    // 是交易日，直接获取数据
    const result = await generator.fetchDateData(targetDate);
    return result;
  } else {
    // 不是交易日，获取最近的交易日
    const recentResult = await generator.getRecentTradingDay(targetDate);
    if (recentResult.success) {
      const tradingDate = recentResult.data.recentTradingDay;
      console.log(`${targetDate} 是非交易日，使用最近的交易日 ${tradingDate}`);
      return await generator.fetchDateData(tradingDate);
    }
  }
}
```

### 2. 批量处理时跳过非交易日

```javascript
async function batchFetchWithTradingDayCheck(dates) {
  const generator = new StockDataGenerator();
  const results = [];

  for (const date of dates) {
    // 检查交易日状态
    const statusResult = await generator.getTradingDayStatus(date);

    if (statusResult.success && statusResult.data.isTradingDay) {
      // 是交易日，获取数据
      const dataResult = await generator.fetchDateData(date);
      results.push({ date, success: dataResult.success, data: dataResult.data });
    } else {
      // 跳过非交易日
      console.log(`跳过非交易日 ${date}: ${statusResult.data.reason}`);
      results.push({
        date,
        success: false,
        reason: statusResult.data.reason,
        isNonTradingDay: true
      });
    }
  }

  return results;
}
```

### 3. 错误恢复策略

```javascript
async function robustDataFetch(date) {
  const generator = new StockDataGenerator();

  try {
    // 首先尝试启用交易日检查
    const result = await generator.fetchDateData(date, {
      checkTradingDay: true
    });

    if (result.success) {
      return result;
    }

    // 如果失败且是非交易日错误，获取最近的交易日
    if (result.metadata && result.metadata.tradingDayStatus) {
      const recentResult = await generator.getRecentTradingDay(date);
      if (recentResult.success) {
        const tradingDate = recentResult.data.recentTradingDay;
        console.log(`使用最近交易日 ${tradingDate} 替代 ${date}`);
        return await generator.fetchDateData(tradingDate);
      }
    }

    // 最后尝试忽略交易日检查
    console.log('尝试忽略交易日检查获取数据...');
    return await generator.fetchDateData(date, {
      checkTradingDay: false
    });

  } catch (error) {
    console.error('数据获取完全失败:', error.message);
    throw error;
  }
}
```

## 节假日数据

### 数据源

- **主要API**: api.apiopen.top/date/query
- **缓存文件**: `cache/holidays/{year}.json`
- **自动更新**: 每年自动获取最新的节假日信息

### 缓存机制

节假日数据会被缓存到本地，减少重复的API请求：

```javascript
// 缓存文件位置
/cache/
  /holidays/
    2025.json  // 2025年节假日数据
    2024.json  // 2024年节假日数据
    ...
```

### 容错处理

当节假日API不可用时，系统会自动降级为基础的周末判断：

```javascript
// API失败时的处理流程
1. 尝试从API获取节假日数据
2. 如果失败，检查本地缓存
3. 如果缓存也没有，使用基础周末判断
4. 记录警告日志，但继续提供服务
```

## 示例和测试

### 运行示例

```bash
# 运交易日功能示例
node example-trading-day.js
```

### 运行测试

```bash
# 运行交易日功能测试
node test-trading-day.js
```

### 示例输出

```
=== 非交易日功能使用示例 ===

📅 示例1: 检查交易日状态
2025-11-08 是非交易日
   状态: 星期六
   建议: 请选择工作日获取数据

🔍 示例2: 获取最近交易日
基准日期: 2025-11-08
最近交易日: 2025-11-07
回溯天数: 1 天

📊 示例3: 获取非交易日数据（默认启用交易日检查）
❌ 数据获取失败（预期行为）
   原因: 2025-11-08 是非交易日: 星期六
   交易日状态: 星期六

📊 示例4: 禁用交易日检查的数据获取
✅ 数据获取成功（忽略交易日检查）
   上交所数据: 0 条
   深交所数据: 0 条

📊 示例5: 交易日数据获取
✅ 交易日数据获取成功
   上交所数据: 1500 条
   深交所数据: 2800 条
   交易日验证: 正常交易日
```

## 故障排除

### 常见问题

1. **节假日API调用失败**
   - 检查网络连接
   - 系统会自动降级为基础判断
   - 查看日志了解具体错误

2. **缓存文件损坏**
   - 删除 `cache/holidays/` 目录下的缓存文件
   - 系统会自动重新获取数据

3. **日期格式错误**
   - 确保使用 YYYY-MM-DD 格式
   - 使用 `DateUtils.isValidDate()` 验证格式

4. **时区问题**
   - 系统使用本地时区
   - 节假日数据基于中国时区

### 调试技巧

```javascript
// 启用详细日志
const generator = new StockDataGenerator();

// 检查具体的交易日状态
const status = await generator.getTradingDayStatus('2025-11-08');
console.log('详细状态:', JSON.stringify(status, null, 2));

// 检查节假日数据
const holidayService = generator.holidayService;
const isHoliday = await holidayService.isHoliday('2025-11-08');
console.log('节假日信息:', isHoliday);
```

## 更新日志

### v1.0.0 (2025-11-04)
- ✨ 新增交易日状态检查功能
- ✨ 集成中国A股节假日API
- ✨ 实现节假日数据缓存机制
- ✨ 添加非交易日错误类型
- ✨ 提供友好的错误提示和建议
- ✨ 支持配置化交易日检查
- ✨ 增强DateUtils工具函数
- ✨ 完善错误处理和容错机制

## 贡献

欢迎提交问题报告和功能请求到项目的 GitHub 仓库。

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。