#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 加载反爬虫配置
let antiCrawlingConfig;
try {
  const configPath = path.join(__dirname, '../config/anti-crawling.json');
  antiCrawlingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.warn('Failed to load anti-crawling config, using defaults:', error.message);
  antiCrawlingConfig = {
    timing: { minDelay: 2000, maxDelay: 8000, maxConcurrentRequests: 2, burstLimit: 3, burstTimeWindow: 30000 },
    userAgents: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    headers: { common: { 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' }, eastmoney: {}, sse: {} },
    retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 16000, backoffMultiplier: 2, jitter: true }
  };
}

// 反爬虫工具类
class AntiCrawlingManager {
  constructor(config) {
    this.config = config;
    this.requestQueue = [];
    this.activeRequests = 0;
    this.currentUserAgentIndex = 0;
    this.sessionCookies = new Map();
    this.requestHistory = [];
  }

  // 获取随机User-Agent
  getRandomUserAgent() {
    const userAgents = this.config.userAgents;
    if (userAgents.length === 0) {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }
    const userAgent = userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % userAgents.length;
    return userAgent;
  }

  // 生成随机延迟
  getRandomDelay() {
    const { minDelay, maxDelay } = this.config.timing;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  // 生成请求头
  generateHeaders(source) {
    const userAgent = this.getRandomUserAgent();
    const headers = {
      'User-Agent': userAgent,
      ...this.config.headers.common
    };

    // 根据数据源添加特定头部
    if (this.config.headers[source]) {
      Object.assign(headers, this.config.headers[source]);
    }

    // 添加随机化头部
    if (Math.random() > 0.5) {
      headers['DNT'] = Math.random() > 0.5 ? '1' : '0';
    }

    if (userAgent.includes('Chrome') && Math.random() > 0.3) {
      headers['Sec-CH-UA'] = '"Google Chrome";v="120", "Chromium";v="120", "Not=A?Brand";v="24"';
      headers['Sec-CH-UA-Mobile'] = '?0';
      headers['Sec-CH-UA-Platform'] = '"Windows"';
    }

    return headers;
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 带重试的请求执行
  async executeWithRetry(requestFn, source, customConfig = {}) {
    const config = { ...this.config.retry, ...customConfig };
    let lastError;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await requestFn();
        this.logRetrySuccess(source, attempt - 1);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt <= config.maxRetries && this.shouldRetry(error)) {
          const delay = this.calculateRetryDelay(attempt - 1, error);
          this.logRetry(source, attempt, error, delay);
          await this.delay(delay);
        } else {
          this.logRetryFailure(source, attempt - 1, error);
          throw error;
        }
      }
    }

    throw lastError;
  }

  // 判断是否应该重试
  shouldRetry(error) {
    const message = error.message.toLowerCase();
    const config = this.config.retry;

    // 检查可重试的错误模式
    for (const pattern of config.retryablePatterns || []) {
      if (message.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // 检查可重试的错误代码
    for (const errorCode of config.retryableErrors || []) {
      if (message.includes(errorCode.toLowerCase())) {
        return true;
      }
    }

    // 网络错误 - 更全面的检测
    if (message.includes('timeout') || message.includes('etimedout') ||
        message.includes('econnreset') || message.includes('econnrefused') ||
        message.includes('econnaborted') || message.includes('socket hang up') ||
        message.includes('connection reset') || message.includes('connection refused') ||
        message.includes('read econnreset') || message.includes('socket error')) {
      return true;
    }

    // HTTP状态码错误
    const statusCodeMatch = message.match(/status\s*code\s*:?\s*(\d{3})/i);
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1]);
      return (config.retryableStatusCodes || []).includes(statusCode);
    }

    // 限流错误
    if (message.includes('rate limit') || message.includes('too many requests') ||
        message.includes('429') || message.includes('request limit')) {
      return true;
    }

    // 非重试错误
    for (const nonRetryCode of config.nonRetryableStatusCodes || []) {
      if (message.includes(nonRetryCode.toString())) {
        return false;
      }
    }

    if (message.includes('401') || message.includes('403') || message.includes('404')) {
      return false;
    }

    return true; // 默认重试未知错误
  }

  // 计算重试延迟
  calculateRetryDelay(attempt, error) {
    const { baseDelay, maxDelay, backoffMultiplier, jitter, socketErrorMultiplier } = this.config.retry;

    let delay = baseDelay * Math.pow(backoffMultiplier, attempt);

    const errorMessage = error.message.toLowerCase();

    // socket错误使用更长的延迟
    if (errorMessage.includes('socket hang up') ||
        errorMessage.includes('connection reset') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('econnaborted')) {
      delay *= (socketErrorMultiplier || 1.5);
    }

    // 限流错误使用更长延迟
    if (errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')) {
      delay *= 2.5; // 限流错误延迟更长
    }

    // 超时错误增加额外延迟
    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      delay *= 1.3;
    }

    delay = Math.min(delay, maxDelay);

    // 添加随机抖动
    if (jitter) {
      const jitterAmount = delay * 0.2; // 增加抖动范围
      delay += (Math.random() - 0.5) * jitterAmount;
    }

    return Math.max(delay, 500); // 最小延迟提高到500ms
  }

  // 记录重试日志
  logRetry(source, attempt, error, delay) {
    console.warn(`[RETRY] ${source} attempt ${attempt}, error: ${error.message}, retrying in ${Math.round(delay)}ms`);
  }

  // 记录重试成功
  logRetrySuccess(source, retries) {
    if (retries > 0) {
      console.log(`[RETRY] ${source} succeeded after ${retries} retries`);
    }
  }

  // 记录重试失败
  logRetryFailure(source, retries, error) {
    console.error(`[RETRY] ${source} failed after ${retries} retries: ${error.message}`);
  }

  // 排队请求
  async queueRequest(requestFn, source, priority = 1) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: requestFn,
        source,
        priority,
        resolve,
        reject,
        createdAt: Date.now()
      });

      // 按优先级排序
      this.requestQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.createdAt - b.createdAt;
      });

      this.processQueue();
    });
  }

  // 处理请求队列
  async processQueue() {
    if (this.activeRequests >= this.config.timing.maxConcurrentRequests ||
        this.requestQueue.length === 0) {
      return;
    }

    const task = this.requestQueue.shift();
    this.activeRequests++;

    try {
      const delay = this.getRandomDelay();
      if (delay > 0) {
        await this.delay(delay);
      }

      const result = await task.execute();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.activeRequests--;
      setImmediate(() => this.processQueue());
    }
  }

  // 记录日志
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

// 导入股票过滤工具函数
function isSTStock(name) {
  if (!name) return false
  return name.startsWith('ST') || name.startsWith('*ST')
}

function isSuspendedStock(tradephase, name) {
  if (!tradephase || !name) return true

  const normalTradingPhase = "T111    "
  if (tradephase.trim() !== normalTradingPhase.trim()) {
    return true
  }

  const suspendedKeywords = ['停牌', '终止上市', '退市', '暂停上市']
  return suspendedKeywords.some(keyword => name.includes(keyword))
}

function shouldFilterStock(stock) {
  if (!stock) return true

  if (isSTStock(stock.name)) {
    return true
  }

  if (isSuspendedStock(stock.tradephase, stock.name)) {
    return true
  }

  return false
}

/**
 * Node.js兼容的股票数据生成器
 * 基于原有的StockDataGenerator，适配Node.js环境
 */
class NodeStockDataGenerator {
  constructor() {
    this.dataDir = 'dist/data';
    this.backupDir = 'data-backup';
    this.cacheDir = 'cache';
    this.verbose = false;
    this.force = false;
    this.antiCrawling = new AntiCrawlingManager(antiCrawlingConfig);
  }

  /**
   * 设置日志级别
   */
  setVerbose(verbose) {
    this.verbose = verbose;
  }

  /**
   * 设置强制模式
   */
  setForce(force) {
    this.force = force;
  }

  /**
   * 日志输出
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else if (this.verbose || level === 'error') {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * 确保目录存在
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.log(`Created directory: ${dirPath}`);
    }
  }

  /**
   * 写入JSON文件
   */
  async writeJsonFile(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      this.ensureDir(dir);

      const jsonStr = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, jsonStr, 'utf8');

      this.log(`Saved data to: ${filePath}`);
      return true;
    } catch (error) {
      this.log(`Failed to save file ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * 读取JSON文件
   */
  async readJsonFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.log(`Failed to read file ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * HTTP请求获取数据
   */
  async fetchData(url, source = 'unknown') {
    return this.antiCrawling.executeWithRetry(async () => {
      this.log(`Fetching data from: ${url} (${source})`);

      const headers = this.antiCrawling.generateHeaders(source);
      const dataSourceConfig = antiCrawlingConfig?.dataSources?.[source] || {};
      const timeout = dataSourceConfig.timeout || 30000;

      // 构建axios配置，包含连接管理
      const axiosConfig = {
        timeout,
        headers,
        // 连接池配置
        maxRedirects: 5,
        // 启用keep-alive
        httpAgent: new (require('http').Agent)({
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: dataSourceConfig.connectionConfig?.maxSockets || 5,
          maxFreeSockets: dataSourceConfig.connectionConfig?.maxFreeSockets || 2,
          timeout: dataSourceConfig.connectionConfig?.timeout || 60000
        }),
        httpsAgent: new (require('https').Agent)({
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: dataSourceConfig.connectionConfig?.maxSockets || 5,
          maxFreeSockets: dataSourceConfig.connectionConfig?.maxFreeSockets || 2,
          timeout: dataSourceConfig.connectionConfig?.timeout || 60000,
          // 添加更宽松的SSL配置以处理连接问题
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined
        })
      };

      const response = await axios.get(url, axiosConfig);
      return response.data;
    }, source);
  }

  /**
   * 获取SSE数据
   */
  async fetchSSEData(date) {
    try {
      const callbackName = `jsonpCallback${Date.now()}`;
      const timestamp = Date.now();
      const url = `https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity?callback=${callbackName}&select=code,name,open,high,low,last,prev_close,chg_rate,volume,amount,tradephase,change,amp_rate,cpxxsubtype,cpxxprodusta&order=&begin=0&end=9999&_=${timestamp}`;

      this.log(`Fetching SSE data from: ${url}`);
      const response = await this.fetchData(url, 'sse');

      // 处理JSONP响应
      if (typeof response === 'string') {
        this.log(`Response type: string, length: ${response.length}`);

        // 更灵活的JSONP解析
        let jsonStr = response;

        // 移除回调函数名和括号
        const callbackPattern = new RegExp(`^${callbackName}\\s*\\(`);
        jsonStr = jsonStr.replace(callbackPattern, '').replace(/\);?\s*$/, '');

        this.log(`Attempting to parse JSON string of length: ${jsonStr.length}`);

        try {
          const data = JSON.parse(jsonStr);
          this.log(`Successfully parsed JSON, keys: ${Object.keys(data).join(', ')}`);

          // 检查数据结构
          let stockData = [];
          if (data.list && Array.isArray(data.list)) {
            stockData = data.list;
            this.log(`Found ${stockData.length} stocks in data.list`);
          } else if (data.result && Array.isArray(data.result)) {
            stockData = data.result;
            this.log(`Found ${stockData.length} stocks in data.result`);
          } else if (data.data && Array.isArray(data.data)) {
            stockData = data.data;
            this.log(`Found ${stockData.length} stocks in data.data`);
          } else if (Array.isArray(data)) {
            stockData = data;
            this.log(`Found ${stockData.length} stocks in root array`);
          } else {
            this.log(`Unexpected data structure: ${JSON.stringify(Object.keys(data))}`);
            this.log(`Available data: ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
          }

          // 将SSE数组格式转换为统一的对象格式
          const formattedStockData = stockData.map(stock => {
            if (Array.isArray(stock)) {
              // SSE数据是数组格式，需要转换为对象格式
              return {
                code: stock[0] || '',
                name: stock[1] || '',
                open: parseFloat(stock[2]) || 0,
                high: parseFloat(stock[3]) || 0,
                low: parseFloat(stock[4]) || 0,
                last: parseFloat(stock[5]) || 0,
                prev_close: parseFloat(stock[6]) || 0,
                chg_rate: parseFloat(stock[7]) || 0,
                volume: parseInt(stock[8]) || 0,
                amount: parseFloat(stock[9]) || 0,
                tradephase: stock[10] || 'T111',
                change: parseFloat(stock[11]) || 0,
                amp_rate: parseFloat(stock[12]) || 0,
                cpxxsubtype: stock[13] || '',
                cpxxprodusta: stock[14] || ''
              };
            } else {
              // 如果已经是对象格式，直接返回
              return stock;
            }
          });

          this.log(`Successfully formatted ${formattedStockData.length} SSE stocks to object format`);

          const result = {
            fetchDate: new Date().toISOString(),
            exchange: 'SSE',
            date: date,
            data: formattedStockData
          };

          // 保存到生产和备份位置
          await this.saveWithBackup('sse', date, result);

          this.log(`Successfully processed SSE data: ${stockData.length} stocks`);
          return result;

        } catch (parseError) {
          this.log(`JSON parse error: ${parseError.message}`, 'error');
          this.log(`JSON string preview: ${jsonStr.substring(0, 200)}...`, 'error');
          throw parseError;
        }
      } else {
        this.log(`Unexpected response type: ${typeof response}`, 'error');
        throw new Error('Expected string response from SSE API');
      }
    } catch (error) {
      this.log(`Failed to fetch SSE data for ${date}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 获取SZSE数据
   */
  async fetchSZSEData(date) {
    try {
      this.log(`Fetching SZSE data from East Money API...`);

      // 使用东方财富API获取深交所数据
      const allStocks = [];
      const pageSize = 100;

      // 计算总页数 - 深交所总共约有2000+只股票
      const totalPages = 25; // 预估需要获取25页数据

      for (let page = 1; page <= totalPages; page++) {
        try {
          // 东方财富API - 深交所股票列表
          // m:0+t:6 - 深证主板，m:0+t:80 - 深证中小板，m:1+t:2 - 深证创业板，m:1+t:23 - 深证其他
          const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=${page}&pz=${pageSize}&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,f21,f22,f23,f24,f25,f26,f27,f28,f29`;

          this.log(`Fetching SZSE page ${page}/${totalPages} from: ${url}`);
          const response = await this.fetchData(url, 'eastmoney');

          if (response && response.data && response.data.diff) {
            const pageStocks = Object.values(response.data.diff);

            if (pageStocks.length === 0) {
              this.log(`No more stocks found on page ${page}, stopping pagination`);
              break;
            }

            // 东方财富API字段映射到统一格式
            const formattedStocks = pageStocks.map(stock => {
              // 处理价格数据，东方财富API中的价格字段可能需要特殊处理
              const lastPrice = parseFloat(stock.f2) || 0; // 当前价
              const prevClose = parseFloat(stock.f18) || 0; // 昨收价
              const openPrice = parseFloat(stock.f17) || 0; // 开盘价
              const highPrice = parseFloat(stock.f15) || 0; // 最高价
              const lowPrice = parseFloat(stock.f16) || 0; // 最低价
              const changeAmount = parseFloat(stock.f4) || 0; // 涨跌额
              const changeRate = parseFloat(stock.f3) || 0; // 涨跌幅(百分比)

              return {
                code: stock.f12 || '',
                name: stock.f14 || '',
                open: openPrice,
                high: highPrice,
                low: lowPrice,
                last: lastPrice,
                prev_close: prevClose,
                chg_rate: changeRate, // 已经是百分比格式
                volume: parseInt(stock.f5) || 0,
                amount: parseFloat(stock.f6) || 0,
                tradephase: 'T111', // 默认交易阶段
                change: changeAmount,
                amp_rate: parseFloat(stock.f23) || 0, // 振幅
                cpxxsubtype: 'ASH', // 默认类型
                cpxxprodusta: '   D  F  N          ' // 默认产品状态
              };
            });

            allStocks.push(...formattedStocks);
            this.log(`Fetched ${formattedStocks.length} stocks from page ${page}, total: ${allStocks.length}`);

            // 如果当前页获取的股票少于pageSize，说明已经获取完毕
            if (pageStocks.length < pageSize) {
              this.log(`Reached end of data on page ${page}`);
              break;
            }

            // 添加页面间随机延迟（反爬虫措施）
            if (page < totalPages) {
              const dataSourceConfig = antiCrawlingConfig?.dataSources?.['eastmoney'] || {};
              const paginationConfig = dataSourceConfig.pagination || {};

              let pageDelay;
              if (paginationConfig.minPageDelay && paginationConfig.maxPageDelay) {
                // 使用配置的分页延迟范围
                pageDelay = Math.floor(Math.random() * (paginationConfig.maxPageDelay - paginationConfig.minPageDelay + 1)) + paginationConfig.minPageDelay;
              } else {
                // 使用默认随机延迟
                pageDelay = this.antiCrawling.getRandomDelay();
              }

              this.log(`Waiting ${Math.round(pageDelay)}ms before fetching next page...`);
              await this.antiCrawling.delay(pageDelay);
            }
          } else {
            this.log(`No valid data found on page ${page}`);
            break;
          }

          // 添加延迟避免请求过于频繁
          if (page < totalPages) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (pageError) {
          this.log(`Error fetching page ${page}: ${pageError.message}`, 'error');
          // 继续尝试下一页
        }
      }

      if (allStocks.length === 0) {
        throw new Error('No SZSE data was fetched from any page');
      }

      this.log(`Successfully fetched ${allStocks.length} SZSE stocks from East Money API`);

      const result = {
        fetchDate: new Date().toISOString(),
        exchange: 'SZSE',
        date: date,
        data: allStocks
      };

      // 保存到生产和备份位置
      await this.saveWithBackup('szse', date, result);

      this.log(`✅ Successfully fetched and saved ${allStocks.length} SZSE stocks`);
      return result;

    } catch (error) {
      this.log(`Failed to fetch SZSE data for ${date}: ${error.message}`, 'error');

      // 如果东方财富API也失败，尝试备用API
      try {
        this.log(`Trying backup API...`);
        return await this.fetchSZSEDataBackup(date);
      } catch (backupError) {
        this.log(`Backup API also failed: ${backupError.message}`, 'error');
        throw new Error(`All SZSE data sources failed: ${error.message}`);
      }
    }
  }

  /**
   * SZSE备用API数据获取
   */
  async fetchSZSEDataBackup(date) {
    try {
      // 使用腾讯财经API作为备用
      const url = `http://qt.gtimg.cn/q=sh000001,sz399001,sz399006`;
      this.log(`Fetching SZSE backup data from: ${url}`);

      const response = await this.fetchData(url);
      this.log(`Backup API response: ${response}`);

      // 如果备用API也失败，抛出错误
      throw new Error('Backup API returned insufficient data');

    } catch (error) {
      this.log(`Backup API failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 生成模拟SZSE数据
   */
  generateMockSZSEData(date) {
    const mockStocks = [
      ['000001', '平安银行', 12.45, 12.78, 12.32, 12.65, 12.50, 1.20, 85432100, 1078954320, 'T111    ', 2.16, 3.27, 'ASH', '   D  F  N          '],
      ['000002', '万科A', 18.76, 19.23, 18.65, 18.98, 18.88, 0.53, 123456789, 2345678901, 'T111    ', 1.87, 2.94, 'ASH', '   D  F  N          '],
      ['000858', '五粮液', 156.78, 159.23, 155.45, 157.89, 156.34, 0.99, 98765432, 15555555555, 'T111    ', 1.00, 2.44, 'ASH', '   D  F  N          '],
      ['000876', '新希望', 16.89, 17.45, 16.67, 17.12, 16.98, 0.83, 67890123, 1156789012, 'T111    ', 1.47, 3.12, 'ASH', '   D  F  N          ']
    ];

    const formattedData = mockStocks.map(stock => ({
      code: stock[0],
      name: stock[1],
      open: stock[2],
      high: stock[3],
      low: stock[4],
      last: stock[5],
      prev_close: stock[6],
      chg_rate: stock[7],
      volume: stock[8],
      amount: stock[9],
      tradephase: stock[10],
      change: stock[11],
      amp_rate: stock[12],
      cpxxsubtype: stock[13],
      cpxxprodusta: stock[14]
    }));

    return {
      fetchDate: new Date().toISOString(),
      exchange: 'SZSE',
      date: date,
      data: formattedData
    };
  }

  /**
   * 获取涨停数据
   */
  async fetchLimitUpData(date) {
    try {
      this.log(`Calculating limit-up data for ${date}...`);

      // 获取SSE和SZSE的股票数据
      const [sseData, szseData] = await Promise.all([
        this.readJsonFile(`${this.dataDir}/sse/${date}.json`),
        this.readJsonFile(`${this.dataDir}/szse/${date}.json`)
      ]);

      let allStocks = [];

      // 合并SSE数据
      if (sseData && sseData.data) {
        allStocks = allStocks.concat(sseData.data.map(stock => ({
          ...stock,
          exchange: 'SSE'
        })));
      }

      // 合并SZSE数据
      if (szseData && szseData.data) {
        allStocks = allStocks.concat(szseData.data.map(stock => ({
          ...stock,
          exchange: 'SZSE'
        })));
      }

      this.log(`Processing ${allStocks.length} stocks for limit-up calculation`);

      // 计算涨停股票
      const limitUpStocks = this.calculateLimitUpStocks(allStocks);

      const result = {
        generateDate: new Date().toISOString(),
        targetDate: date,
        totalCount: limitUpStocks.length,
        mainBoardCount: limitUpStocks.filter(s => this.isMainBoard(s.code)).length,
        growthBoardCount: limitUpStocks.filter(s => this.isGrowthBoard(s.code)).length,
        calculationMethod: '基于前日收盘价计算涨跌幅，涨幅>=9.9%为涨停',
        stocks: limitUpStocks
      };

      await this.saveWithBackup('limitup', date, result);
      this.log(`Successfully calculated limit-up data: ${limitUpStocks.length} stocks`);

      return result;

    } catch (error) {
      this.log(`Failed to calculate limit-up data for ${date}: ${error.message}`, 'error');

      // 返回空结果而不是抛出错误
      const emptyResult = {
        generateDate: new Date().toISOString(),
        targetDate: date,
        totalCount: 0,
        mainBoardCount: 0,
        growthBoardCount: 0,
        calculationMethod: '基于前日收盘价计算涨跌幅，涨幅>=9.9%为涨停',
        stocks: [],
        errors: [error.message]
      };

      await this.saveWithBackup('limitup', date, emptyResult);
      return emptyResult;
    }
  }

  /**
   * 获取跌停数据
   */
  async fetchLimitDownData(date) {
    try {
      this.log(`Calculating limit-down data for ${date}...`);

      // 获取SSE和SZSE的股票数据
      const [sseData, szseData] = await Promise.all([
        this.readJsonFile(`${this.dataDir}/sse/${date}.json`),
        this.readJsonFile(`${this.dataDir}/szse/${date}.json`)
      ]);

      let allStocks = [];

      // 合并SSE数据
      if (sseData && sseData.data) {
        allStocks = allStocks.concat(sseData.data.map(stock => ({
          ...stock,
          exchange: 'SSE'
        })));
      }

      // 合并SZSE数据
      if (szseData && szseData.data) {
        allStocks = allStocks.concat(szseData.data.map(stock => ({
          ...stock,
          exchange: 'SZSE'
        })));
      }

      this.log(`Processing ${allStocks.length} stocks for limit-down calculation`);

      // 计算跌停股票
      const limitDownStocks = this.calculateLimitDownStocks(allStocks);

      const result = {
        generateDate: new Date().toISOString(),
        targetDate: date,
        totalCount: limitDownStocks.length,
        mainBoardCount: limitDownStocks.filter(s => this.isMainBoard(s.code)).length,
        growthBoardCount: limitDownStocks.filter(s => this.isGrowthBoard(s.code)).length,
        calculationMethod: '基于前日收盘价计算涨跌幅，跌幅<=-9.9%为跌停',
        stocks: limitDownStocks
      };

      await this.saveWithBackup('limitdown', date, result);
      this.log(`Successfully calculated limit-down data: ${limitDownStocks.length} stocks`);

      return result;

    } catch (error) {
      this.log(`Failed to calculate limit-down data for ${date}: ${error.message}`, 'error');

      // 返回空结果而不是抛出错误
      const emptyResult = {
        generateDate: new Date().toISOString(),
        targetDate: date,
        totalCount: 0,
        mainBoardCount: 0,
        growthBoardCount: 0,
        calculationMethod: '基于前日收盘价计算涨跌幅，跌幅<=-9.9%为跌停',
        stocks: [],
        errors: [error.message]
      };

      await this.saveWithBackup('limitdown', date, emptyResult);
      return emptyResult;
    }
  }

  /**
   * 计算涨停股票
   */
  calculateLimitUpStocks(stocks) {
    const limitUpStocks = [];
    let rank = 1;
    let filteredCount = 0;
    let stCount = 0;
    let suspendedCount = 0;

    for (const stock of stocks) {
      try {
        // 过滤ST股票和停牌股票
        if (shouldFilterStock(stock)) {
          filteredCount++;
          if (isSTStock(stock.name)) stCount++;
          if (isSuspendedStock(stock.tradephase, stock.name)) suspendedCount++;
          continue;
        }

        const prevClose = parseFloat(stock.prev_close || 0);
        const currentPrice = parseFloat(stock.last || 0);

        if (prevClose > 0 && currentPrice > 0) {
          const changeRate = ((currentPrice - prevClose) / prevClose) * 100;

          // 涨停判断：涨幅 >= 9.9%（已过滤ST股票，所以不再需要判断ST）
          const limitThreshold = 9.9;

          if (changeRate >= limitThreshold) {
            limitUpStocks.push({
              rank: rank++,
              code: stock.code,
              name: stock.name,
              exchange: stock.exchange,
              boardType: this.getBoardType(stock.code),
              prevClose: prevClose,
              last: currentPrice,
              limitThreshold: limitThreshold,
              limitRate: changeRate,
              actualChangeRate: changeRate,
              change: currentPrice - prevClose,
              open: parseFloat(stock.open || 0),
              high: parseFloat(stock.high || 0),
              low: parseFloat(stock.low || 0),
              volume: parseInt(stock.volume || 0),
              amount: parseFloat(stock.amount || 0),
              amp_rate: parseFloat(stock.amp_rate || 0),
              tradephase: stock.tradephase || 'T111'
            });
          }
        }
      } catch (error) {
        this.log(`Error processing stock ${stock.code}: ${error.message}`, 'warn');
      }
    }

    // 输出过滤统计信息
    this.log(`Limit-up filtering: removed ${filteredCount} stocks (${stCount} ST stocks, ${suspendedCount} suspended stocks)`, 'info');

    // 按涨幅排序
    return limitUpStocks.sort((a, b) => b.actualChangeRate - a.actualChangeRate);
  }

  /**
   * 计算跌停股票
   */
  calculateLimitDownStocks(stocks) {
    const limitDownStocks = [];
    let rank = 1;
    let filteredCount = 0;
    let stCount = 0;
    let suspendedCount = 0;

    for (const stock of stocks) {
      try {
        // 过滤ST股票和停牌股票
        if (shouldFilterStock(stock)) {
          filteredCount++;
          if (isSTStock(stock.name)) stCount++;
          if (isSuspendedStock(stock.tradephase, stock.name)) suspendedCount++;
          continue;
        }

        const prevClose = parseFloat(stock.prev_close || 0);
        const currentPrice = parseFloat(stock.last || 0);

        if (prevClose > 0 && currentPrice > 0) {
          const changeRate = ((currentPrice - prevClose) / prevClose) * 100;

          // 跌停判断：跌幅 <= -9.9%（已过滤ST股票，所以不再需要判断ST）
          const limitThreshold = -9.9;

          if (changeRate <= limitThreshold) {
            limitDownStocks.push({
              rank: rank++,
              code: stock.code,
              name: stock.name,
              exchange: stock.exchange,
              boardType: this.getBoardType(stock.code),
              prevClose: prevClose,
              last: currentPrice,
              limitThreshold: Math.abs(limitThreshold),
              limitRate: Math.abs(changeRate),
              actualChangeRate: changeRate,
              change: currentPrice - prevClose,
              open: parseFloat(stock.open || 0),
              high: parseFloat(stock.high || 0),
              low: parseFloat(stock.low || 0),
              volume: parseInt(stock.volume || 0),
              amount: parseFloat(stock.amount || 0),
              amp_rate: parseFloat(stock.amp_rate || 0),
              tradephase: stock.tradephase || 'T111'
            });
          }
        }
      } catch (error) {
        this.log(`Error processing stock ${stock.code}: ${error.message}`, 'warn');
      }
    }

    // 输出过滤统计信息
    this.log(`Limit-down filtering: removed ${filteredCount} stocks (${stCount} ST stocks, ${suspendedCount} suspended stocks)`, 'info');

    // 按跌幅排序
    return limitDownStocks.sort((a, b) => a.actualChangeRate - b.actualChangeRate);
  }

  /**
   * 判断是否为主板股票
   */
  isMainBoard(code) {
    // 上交所主板：600xxx, 601xxx, 603xxx, 605xxx
    // 深交所主板：000xxx, 001xxx
    const sseMainBoard = /^(600|601|603|605)/;
    const szseMainBoard = /^(000|001)/;
    return sseMainBoard.test(code) || szseMainBoard.test(code);
  }

  /**
   * 判断是否为创业板股票
   */
  isGrowthBoard(code) {
    // 创业板：300xxx
    // 科创板：688xxx
    return /^300/.test(code) || /^688/.test(code);
  }

  /**
   * 获取板块类型
   */
  getBoardType(code) {
    if (/^(600|601|603|605)/.test(code)) return '上交所主板';
    if (/^688/.test(code)) return '科创板';
    if (/^(000|001)/.test(code)) return '深交所主板';
    if (/^300/.test(code)) return '创业板';
    return '其他';
  }

  /**
   * 涨停数据计算别名方法 - 保持向后兼容
   */
  async calculateLimitUpData(date) {
    return await this.fetchLimitUpData(date);
  }

  /**
   * 跌停数据计算别名方法 - 保持向后兼容
   */
  async calculateLimitDownData(date) {
    return await this.fetchLimitDownData(date);
  }

  /**
   * 指数数据获取别名方法 - 保持向后兼容
   */
  async fetchIndicesData(date) {
    return await this.fetchIndexData(date);
  }

  /**
   * 获取指数数据
   */
  async fetchIndexData(date) {
    try {
      this.log(`Fetching index data for ${date}...`);

      // 模拟主要指数数据
      const mockIndices = [
        // 上证指数
        {
          code: '000001',
          name: '上证指数',
          market: 'SSE',
          open: 3050.12,
          high: 3085.67,
          low: 3045.23,
          last: 3072.45,
          prev_close: 3058.91,
          change: 13.54,
          chg_rate: 0.44,
          volume: 285632400,
          amount: 3421567800,
          amp_rate: 1.31,
          turnover: 0.89,
          pe: 14.52,
          pb: 1.35,
          market_cap: 4235678900,
          update_time: '15:00:00'
        },
        // 上证50
        {
          code: '000016',
          name: '上证50',
          market: 'SSE',
          open: 2450.34,
          high: 2475.89,
          low: 2432.12,
          last: 2465.78,
          prev_close: 2458.23,
          change: 7.55,
          chg_rate: 0.31,
          volume: 156789200,
          amount: 1923456700,
          amp_rate: 1.79,
          turnover: 0.65,
          pe: 12.34,
          pb: 1.18,
          market_cap: 2134567800,
          update_time: '15:00:00'
        },
        // 深证成指
        {
          code: '399001',
          name: '深证成指',
          market: 'SZSE',
          open: 9850.67,
          high: 9925.34,
          low: 9785.23,
          last: 9875.45,
          prev_close: 9845.12,
          change: 30.33,
          chg_rate: 0.31,
          volume: 198456700,
          amount: 2345678900,
          amp_rate: 1.43,
          turnover: 1.02,
          pe: 16.78,
          pb: 1.89,
          market_cap: 1876543200,
          update_time: '15:00:00'
        },
        // 创业板指
        {
          code: '399006',
          name: '创业板指',
          market: 'SZSE',
          open: 1850.23,
          high: 1885.67,
          low: 1825.34,
          last: 1865.89,
          prev_close: 1850.12,
          change: 15.77,
          chg_rate: 0.85,
          volume: 85678900,
          amount: 678456700,
          amp_rate: 3.27,
          turnover: 2.34,
          pe: 42.15,
          pb: 3.45,
          market_cap: 987654300,
          update_time: '15:00:00'
        },
        // 科创50
        {
          code: '000688',
          name: '科创50',
          market: 'SSE',
          open: 950.45,
          high: 975.23,
          low: 940.12,
          last: 965.78,
          prev_close: 958.23,
          change: 7.55,
          chg_rate: 0.79,
          volume: 67891200,
          amount: 456789000,
          amp_rate: 3.68,
          turnover: 1.45,
          pe: 35.67,
          pb: 2.89,
          market_cap: 765432100,
          update_time: '15:00:00'
        },
        // 中证500
        {
          code: '000905',
          name: '中证500',
          market: 'SSE',
          open: 5250.34,
          high: 5315.67,
          low: 5185.23,
          last: 5275.89,
          prev_close: 5258.12,
          change: 17.77,
          chg_rate: 0.34,
          volume: 123456700,
          amount: 1567890000,
          amp_rate: 2.48,
          turnover: 0.89,
          pe: 18.45,
          pb: 1.67,
          market_cap: 1654321000,
          update_time: '15:00:00'
        }
      ];

      const result = {
        fetchDate: new Date().toISOString(),
        indices: mockIndices,
        source: 'simulated',
        metadata: {
          tradingDay: true,
          fetchTime: new Date().toISOString(),
          dataPoints: mockIndices.length,
          totalRequested: mockIndices.length,
          errors: []
        }
      };

      await this.saveWithBackup('indices', date, result);
      this.log(`Successfully fetched index data: ${mockIndices.length} indices`);

      return result;
    } catch (error) {
      this.log(`Failed to fetch index data for ${date}: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 同时保存到生产和备份位置
   */
  async saveWithBackup(dataType, date, data) {
    const promises = [
      this.writeJsonFile(`${this.dataDir}/${dataType}/${date}.json`, data),
      this.writeJsonFile(`${this.backupDir}/${dataType}/${date}.json`, data)
    ];

    await Promise.allSettled(promises);
    this.log(`Data saved to both production and backup: ${dataType}/${date}`);
  }

  /**
   * 生成指定日期的完整数据
   */
  async fetchDateData(date, dataTypes = ['sse', 'szse', 'limitup', 'limitdown', 'indices']) {
    this.log(`Starting data generation for ${date}...`);
    this.log(`Data types: ${dataTypes.join(', ')}`);

    const results = {
      date: date,
      fetchDate: new Date().toISOString(),
      data: {},
      errors: [],
      summary: {
        total: dataTypes.length,
        success: 0,
        failed: 0
      }
    };

    for (const dataType of dataTypes) {
      try {
        this.log(`Fetching ${dataType} data...`);
        let data;

        switch (dataType) {
          case 'sse':
            data = await this.fetchSSEData(date);
            break;
          case 'szse':
            data = await this.fetchSZSEData(date);
            break;
          case 'limitup':
            data = await this.fetchLimitUpData(date);
            break;
          case 'limitdown':
            data = await this.fetchLimitDownData(date);
            break;
          case 'indices':
            data = await this.fetchIndexData(date);
            break;
          default:
            throw new Error(`Unknown data type: ${dataType}`);
        }

        results.data[dataType] = data;
        results.summary.success++;
        this.log(`✓ Successfully fetched ${dataType} data`);

      } catch (error) {
        const errorMsg = `Failed to fetch ${dataType} data: ${error.message}`;
        results.errors.push(errorMsg);
        results.summary.failed++;
        this.log(`✗ ${errorMsg}`, 'error');
      }
    }

    // 保存完整数据
    await this.writeJsonFile(`${this.dataDir}/complete/${date}.json`, results);
    await this.writeJsonFile(`${this.backupDir}/complete/${date}.json`, results);

    this.log(`Data generation completed for ${date}`);
    this.log(`Summary: ${results.summary.success} success, ${results.summary.failed} failed`);

    return results;
  }

  /**
   * 生成当前日期数据
   */
  async fetchCurrentData(dataTypes) {
    const today = new Date().toISOString().split('T')[0];
    return await this.fetchDateData(today, dataTypes);
  }

  /**
   * 生成昨天数据
   */
  async fetchYesterdayData(dataTypes) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    return await this.fetchDateData(dateStr, dataTypes);
  }

  /**
   * 检查数据是否已存在
   */
  async dataExists(dataType, date) {
    const filePath = `${this.dataDir}/${dataType}/${date}.json`;
    return fs.existsSync(filePath);
  }
}

module.exports = NodeStockDataGenerator;