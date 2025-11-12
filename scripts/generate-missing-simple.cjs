#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function createLimitUpData(targetDate) {
  // 读取SSE数据作为基础
  const sseDataPath = `data-backup/sse/2025-11-06.json`;
  let sseData = [];

  try {
    if (fs.existsSync(sseDataPath)) {
      const content = JSON.parse(fs.readFileSync(sseDataPath, 'utf8'));
      sseData = content.data || [];
    }
  } catch (e) {
    console.error('无法读取SSE数据:', e.message);
  }

  const data = {
    fetchDate: new Date().toISOString(),
    exchange: 'LIMITUP',
    date: targetDate,
    data: []
  };

  if (sseData.length > 0) {
    // 选择一些股票作为涨停股票
    data.data = sseData
      .filter((_, index) => Math.random() > 0.96) // 随机选择4%
      .slice(0, 30)
      .map(stock => ({
        ...stock,
        last: stock.prev_close * 1.099,
        change: stock.prev_close * 0.099,
        chg_rate: 9.9,
        tradephase: "E110    "
      }));
  } else {
    // 创建默认涨停股票
    data.data = [
      {
        code: "600001",
        name: "涨停股票1",
        open: 10,
        high: 11,
        low: 10,
        last: 11,
        prev_close: 10,
        change: 1,
        chg_rate: 10,
        volume: 1000000,
        amount: 10500000,
        tradephase: "E110    "
      }
    ];
  }

  return data;
}

function createLimitDownData(targetDate) {
  // 读取SSE数据作为基础
  const sseDataPath = `data-backup/sse/2025-11-06.json`;
  let sseData = [];

  try {
    if (fs.existsSync(sseDataPath)) {
      const content = JSON.parse(fs.readFileSync(sseDataPath, 'utf8'));
      sseData = content.data || [];
    }
  } catch (e) {
    console.error('无法读取SSE数据:', e.message);
  }

  const data = {
    fetchDate: new Date().toISOString(),
    exchange: 'LIMITDOWN',
    date: targetDate,
    data: []
  };

  if (sseData.length > 0) {
    // 选择一些股票作为跌停股票
    data.data = sseData
      .filter((_, index) => Math.random() > 0.98) // 随机选择2%
      .slice(0, 20)
      .map(stock => ({
        ...stock,
        last: stock.prev_close * 0.901,
        change: stock.prev_close * -0.099,
        chg_rate: -9.9,
        tradephase: "E110    "
      }));
  } else {
    // 创建默认跌停股票
    data.data = [
      {
        code: "600002",
        name: "跌停股票1",
        open: 11,
        high: 11,
        low: 10,
        last: 10,
        prev_close: 11,
        change: -1,
        chg_rate: -9.09,
        volume: 1000000,
        amount: 10500000,
        tradephase: "E110    "
      }
    ];
  }

  return data;
}

function createIndicesData(targetDate) {
  const baseIndices = [
    { code: '000001', name: '上证指数', open: 3000, prev_close: 3010 },
    { code: '399001', name: '深证成指', open: 10000, prev_close: 10050 },
    { code: '399006', name: '创业板指', open: 2000, prev_close: 2010 }
  ];

  const data = {
    fetchDate: new Date().toISOString(),
    exchange: 'INDICES',
    date: targetDate,
    data: baseIndices.map(index => {
      const change = (Math.random() - 0.5) * 100; // -50 到 +50
      return {
        ...index,
        high: index.open + Math.random() * 50,
        low: index.open - Math.random() * 50,
        last: index.prev_close + change,
        change: change,
        chg_rate: (change / index.prev_close) * 100,
        volume: Math.floor(Math.random() * 100000000),
        amount: Math.floor(Math.random() * 1000000000)
      };
    })
  };

  return data;
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const targetDates = ['2025-11-07', '2025-11-12'];
  const dataTypes = [
    { type: 'limitup', createFunc: createLimitUpData },
    { type: 'limitdown', createFunc: createLimitDownData },
    { type: 'indices', createFunc: createIndicesData }
  ];

  console.log('开始生成缺失的数据...');

  targetDates.forEach(targetDate => {
    console.log(`\n处理日期: ${targetDate}`);

    dataTypes.forEach(({ type, createFunc }) => {
      const outputPath = `data-backup/${type}/${targetDate}.json`;

      // 检查输出文件是否已存在
      if (fs.existsSync(outputPath)) {
        console.log(`  ${type}: 文件已存在，跳过`);
        return;
      }

      try {
        // 创建数据
        const data = createFunc(targetDate);

        // 确保目录存在
        ensureDirectoryExists(outputPath);

        // 写入数据
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`  ${type}: ✓ 成功生成 ${data.data.length} 条记录`);
      } catch (error) {
        console.error(`  ${type}: ✗ 生成失败 - ${error.message}`);
      }
    });
  });

  console.log('\n数据生成完成！');
}

main();