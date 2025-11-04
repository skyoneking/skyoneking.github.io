# 股票行情数据抓取系统

一个基于Node.js的股票行情数据抓取工具，支持上交所(SSE)和深交所(SZSE)的数据获取与本地缓存。

## 功能特性

- ✅ 支持上交所(SSE)和深交所(SZSE)数据获取
- ✅ 上交所使用官方API，深交所使用东方财富API
- ✅ 自动缓存机制，避免重复API请求
- ✅ 支持当日数据和历史数据获取
- ✅ 命令行界面，操作简单
- ✅ JSON格式存储，易于处理
- ✅ 完整的错误处理和日志记录
- ✅ 支持批量获取日期范围数据

## 安装和设置

1. 确保已安装Node.js (>=14.0.0)

2. 安装依赖：
```bash
npm install
```

3. 项目结构：
```
F:\tz\tzsj\
├── src\
│   ├── config\          # 配置文件
│   ├── services\        # 数据服务
│   ├── utils\           # 工具函数
│   └── index.js         # 主程序入口
├── data\                # 数据缓存目录
│   ├── sse\            # 上交所数据
│   └── szse\           # 深交所数据
├── logs\                # 日志文件
├── package.json
└── README.md
```

## 使用方法

### 基本命令

1. **获取当日数据**：
```bash
npm start
# 或
node src/index.js current
```

2. **获取指定日期数据**：
```bash
node src/index.js date 2024-01-15
```

3. **批量获取日期范围数据**：
```bash
node src/index.js range 2024-01-10 2024-01-15
```

4. **刷新缓存**：
```bash
# 刷新当日缓存
node src/index.js refresh

# 刷新指定日期缓存
node src/index.js refresh 2024-01-15
```

5. **查看缓存状态**：
```bash
node src/index.js cache-status
```

6. **清理过期缓存**：
```bash
# 清理超过30天的缓存（默认）
node src/index.js clean-cache

# 清理超过7天的缓存
node src/index.js clean-cache 7
```

### 高级选项

- **指定交易所**：
```bash
# 只获取上交所数据
node src/index.js current -e sse

# 只获取深交所数据
node src/index.js current -e szse
```

- **不使用缓存**：
```bash
node src/index.js current --no-cache
```

- **查看帮助**：
```bash
node src/index.js --help
```

## 数据格式

获取的数据以JSON格式存储，结构如下：

```json
{
  "fetchDate": "2024-01-15 10:30:00",
  "exchange": "SSE",
  "date": "2024-01-15",
  "data": [
    {
      "code": "600000",
      "name": "浦发银行",
      "open": 10.50,
      "high": 10.80,
      "low": 10.45,
      "last": 10.75,
      "prev_close": 10.48,
      "chg_rate": 2.58,
      "volume": 12500000,
      "amount": 134500000,
      "tradephase": "交易中",
      "change": 0.27,
      "amp_rate": 3.34,
      "cpxxsubtype": "A股",
      "cpxxprodusta": "主板"
    }
  ]
}
```

## 文件存储

- **上交所数据**：`data/sse/YYYY-MM-DD.json`
- **深交所数据**：`data/szse/YYYY-MM-DD.json`
- **日志文件**：`logs/error-YYYY-MM-DD.log`

## 配置说明

### API配置
- 上交所API配置：`src/config/api-endpoints.js` 中的 `SSE_CONFIG`
- 深交所API配置：`src/config/api-endpoints.js` 中的 `SZSE_CONFIG`

### 缓存设置
- 默认缓存有效期：24小时
- 缓存清理：默认保留30天
- 可通过代码修改 `CacheService` 中的设置

## 数据字段说明

| 字段 | 说明 |
|------|------|
| code | 股票代码 |
| name | 股票名称 |
| open | 开盘价 |
| high | 最高价 |
| low | 最低价 |
| last | 最新价 |
| prev_close | 昨收价 |
| chg_rate | 涨跌幅(%) |
| volume | 成交量 |
| amount | 成交额 |
| tradephase | 交易阶段 |
| change | 涨跌额 |
| amp_rate | 振幅(%) |
| cpxxsubtype | 产品类型 |
| cpxxprodusta | 交易所 |

## 错误处理

- 网络请求失败会自动重试
- 错误信息会记录到日志文件
- 缓存读取失败会自动从API获取
- 所有异常都有详细的错误提示

## 数据源说明

### API数据源
- **上交所(SSE)**: 使用官方API接口，数据准确可靠
- **深交所(SZSE)**: 使用东方财富API作为数据源，由于深交所官方API限制，采用第三方数据源

### 注意事项

1. 请遵守相关交易所的API使用条款
2. 合理控制请求频率，避免对服务器造成压力
3. 定期清理过期缓存，节省存储空间
4. 交易日和非交易日的数据可能有所不同
5. 深交所数据来源于东方财富，可能包含科创板股票（代码以688开头）

## 开发说明

如需修改或扩展功能：

1. **添加新的数据源**：在 `src/services/` 目录下创建新的服务类
2. **修改数据格式**：在服务类中的 `normalizeStockData` 方法中修改
3. **调整缓存策略**：修改 `CacheService` 中的相关方法
4. **添加新的命令**：在 `src/index.js` 中添加新的命令处理

## License

MIT License