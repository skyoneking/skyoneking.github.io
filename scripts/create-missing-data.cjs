#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 需要生成数据的日期
const targetDates = ['2025-11-10', '2025-11-11'];
const dataTypes = ['sse', 'szse', 'limitup', 'limitdown', 'indices'];

// 使用现有的最新数据作为模板
const templateDate = '2025-11-06'; // 或使用可用的最新日期

function createMockData(templateData, targetDate, dataType) {
  if (!templateData || !templateData.data) {
    console.error(`无效的模板数据 for ${dataType}`);
    return null;
  }

  const mockData = {
    fetchDate: new Date().toISOString(),
    exchange: dataType.toUpperCase(),
    date: targetDate,
    data: []
  };

  // 为不同数据类型创建不同的模拟逻辑
  switch (dataType) {
    case 'sse':
    case 'szse':
      // 复制大部分股票数据，但调整价格和成交量
      mockData.data = templateData.data.map((stock, index) => {
        // 创建小的随机价格变动
        const priceChange = (Math.random() - 0.5) * 0.1; // -5% 到 +5%
        const volumeChange = 0.8 + Math.random() * 0.4; // 80% 到 120%

        return {
          ...stock,
          last: stock.last * (1 + priceChange),
          open: stock.open * (1 + priceChange),
          high: stock.high * (1 + priceChange),
          low: stock.low * (1 + priceChange),
          prev_close: stock.last, // 前一日的收盘价
          change: stock.last * priceChange,
          chg_rate: priceChange * 100,
          volume: Math.floor(stock.volume * volumeChange),
          amount: Math.floor(stock.amount * volumeChange),
          tradephase: "E110    " // 交易完成状态
        };
      });
      break;

    case 'limitup':
      // 创建涨幅超过9.9%的股票 - 使用SSE数据作为基础
      const sseDataPath = `data-backup/sse/${templateDate}.json`;
      let sseData = [];
      try {
        if (fs.existsSync(sseDataPath)) {
          const sseContent = JSON.parse(fs.readFileSync(sseDataPath, 'utf8'));
          sseData = sseContent.data || [];
        }
      } catch (e) {
        console.error('无法读取SSE数据:', e.message);
      }

      if (sseData.length > 0) {
        mockData.data = sseData
          .filter(stock => Math.random() > 0.92) // 随机选择8%
          .slice(0, 50) // 限制数量
          .map(stock => ({
            ...stock,
            last: stock.prev_close * (1 + 0.099 + Math.random() * 0.01), // 9.9% - 10.9%
            change: stock.prev_close * (0.099 + Math.random() * 0.01),
            chg_rate: 9.9 + Math.random() * 1,
            tradephase: "E110    "
          }));
      } else {
        // 如果没有SSE数据，创建一些默认的涨停股票
        mockData.data = [
          { code: '600001', name: '涨停股票1', open: 10, high: 11, low: 10, last: 11, prev_close: 10, change: 1, chg_rate: 10, volume: 1000000, amount: 10500000 },
          { code: '600002', name: '涨停股票2', open: 20, high: 22, low: 20, last: 22, prev_close: 20, change: 2, chg_rate: 10, volume: 2000000, amount: 21000000 }
        ];
      }
      break;

    case 'limitdown':
      // 创建跌幅超过9.9%的股票 - 使用SSE数据作为基础
      const sseDownDataPath = `data-backup/sse/${templateDate}.json`;
      let sseDownData = [];
      try {
        if (fs.existsSync(sseDownDataPath)) {
          const sseDownContent = JSON.parse(fs.readFileSync(sseDownDataPath, 'utf8'));
          sseDownData = sseDownContent.data || [];
        }
      } catch (e) {
        console.error('无法读取SSE数据:', e.message);
      }

      if (sseDownData.length > 0) {
        mockData.data = sseDownData
          .filter(stock => Math.random() > 0.95) // 随机选择5%
          .slice(0, 30) // 限制数量
          .map(stock => ({
            ...stock,
            last: stock.prev_close * (1 - 0.099 - Math.random() * 0.01), // -9.9% 到 -10.9%
            change: stock.prev_close * (-0.099 - Math.random() * 0.01),
            chg_rate: -(9.9 + Math.random() * 1),
            tradephase: "E110    "
          }));
      } else {
        // 如果没有SSE数据，创建一些默认的跌停股票
        mockData.data = [
          { code: '600003', name: '跌停股票1', open: 11, high: 11, low: 10, last: 10, prev_close: 11, change: -1, chg_rate: -9.09, volume: 1000000, amount: 10500000 },
          { code: '600004', name: '跌停股票2', open: 22, high: 22, low: 20, last: 20, prev_close: 22, change: -2, chg_rate: -9.09, volume: 2000000, amount: 21000000 }
        ];
      }
      break;

    case 'indices':
      // 创建主要指数数据
      const indexTemplate = templateData && templateData.data ? templateData.data : [
        { code: '000001', name: '上证指数', open: 3000, high: 3050, low: 2980, last: 3020, prev_close: 3010 },
        { code: '399001', name: '深证成指', open: 10000, high: 10200, low: 9900, last: 10100, prev_close: 10050 },
        { code: '399006', name: '创业板指', open: 2000, high: 2050, low: 1980, last: 2020, prev_close: 2010 }
      ];

      mockData.data = indexTemplate.map(index => {
        const change = (Math.random() - 0.5) * 100; // -50 到 +50
        return {
          ...index,
          last: index.prev_close + change,
          change: change,
          chg_rate: (change / index.prev_close) * 100,
          volume: Math.floor(Math.random() * 100000000),
          amount: Math.floor(Math.random() * 1000000000)
        };
      });
      break;

    default:
      console.error(`未知的数据类型: ${dataType}`);
      return null;
  }

  return mockData;
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  console.log('开始生成模拟数据...');

  targetDates.forEach(targetDate => {
    console.log(`\n处理日期: ${targetDate}`);

    dataTypes.forEach(dataType => {
      const templatePath = `data-backup/${dataType}/${templateDate}.json`;
      const outputPath = `data-backup/${dataType}/${targetDate}.json`;

      try {
        // 检查输出文件是否已存在
        if (fs.existsSync(outputPath)) {
          console.log(`  ${dataType}: 文件已存在，跳过`);
          return;
        }

        // 检查模板文件是否存在
        if (!fs.existsSync(templatePath)) {
          console.log(`  ${dataType}: 模板文件不存在，跳过`);
          return;
        }

        // 读取模板数据
        const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

        // 创建模拟数据
        const mockData = createMockData(templateData, targetDate, dataType);

        if (mockData) {
          // 确保目录存在
          ensureDirectoryExists(outputPath);

          // 写入数据
          fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2));
          console.log(`  ${dataType}: ✓ 成功生成 ${mockData.data.length} 条记录`);
        } else {
          console.log(`  ${dataType}: ✗ 生成失败`);
        }
      } catch (error) {
        console.error(`  ${dataType}: 错误 - ${error.message}`);
      }
    });
  });

  console.log('\n模拟数据生成完成！');
}

main();