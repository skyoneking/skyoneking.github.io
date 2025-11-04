const StockDataGenerator = require('./src/index');

/**
 * 指数数据获取示例
 * 演示如何获取上证指数和深证成指的交易数据
 */
async function exampleIndexDataUsage() {
  console.log('=== 指数数据获取示例 ===\n');

  const generator = new StockDataGenerator();

  // 示例1: 获取今日指数数据
  console.log('📊 示例1: 获取今日指数数据');
  try {
    const todayResult = await generator.generateIndexData();

    if (todayResult.success) {
      const data = todayResult.data;
      console.log(`✅ 今日指数数据获取成功 (${data.date})`);
      console.log(`   数据源: ${data.source}`);
      console.log(`   获取时间: ${data.fetchDate}`);
      console.log(`   指数数量: ${data.indices.length}`);

      // 显示每个指数的基本信息
      data.indices.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name} (${index.code})`);
        console.log(`      最新点位: ${index.last}`);
        console.log(`      涨跌幅: ${index.chg_rate}%`);
        console.log(`      成交额: ${index.amount} 亿元`);
        console.log(`      成交量: ${index.volume} 手`);
      });

      if (todayResult.metadata.files && todayResult.metadata.files.length > 0) {
        console.log(`   文件保存: ${todayResult.metadata.files.join(', ')}`);
      }
    } else {
      console.log('❌ 今日指数数据获取失败');
      console.log(`   错误: ${todayResult.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ 示例1执行失败:', error.message);
  }
  console.log('');

  // 示例2: 获取指定日期的指数数据
  console.log('📅 示例2: 获取指定日期的指数数据');
  const targetDate = '2025-11-03'; // 可以修改为具体日期
  try {
    const dateResult = await generator.generateIndexData(targetDate);

    if (dateResult.success) {
      const data = dateResult.data;
      console.log(`✅ ${targetDate} 指数数据获取成功`);
      console.log(`   交易日: ${data.metadata.tradingDay ? '是' : '否'}`);

      data.indices.forEach(index => {
        console.log(`   ${index.name}: 开盘 ${index.open}, 最高 ${index.high}, 最低 ${index.low}, 收盘 ${index.last}`);
      });
    } else {
      console.log(`❌ ${targetDate} 指数数据获取失败`);
      console.log(`   错误: ${dateResult.errors.join(', ')}`);

      // 显示交易日状态
      if (dateResult.metadata && dateResult.metadata.tradingDayStatus) {
        const status = dateResult.metadata.tradingDayStatus;
        console.log(`   交易日状态: ${status.reason}`);
        console.log(`   建议: ${status.suggestion}`);
      }
    }
  } catch (error) {
    console.error('❌ 示例2执行失败:', error.message);
  }
  console.log('');

  // 示例3: 获取单个指数数据
  console.log('🎯 示例3: 获取单个指数数据（上证指数）');
  try {
    const singleResult = await generator.getSingleIndexData('000001.SH', targetDate);

    if (singleResult.success) {
      const index = singleResult.data;
      console.log(`✅ 上证指数数据获取成功`);
      console.log(`   代码: ${index.code}`);
      console.log(`   名称: ${index.name}`);
      console.log(`   最新点位: ${index.last}`);
      console.log(`   涨跌点数: ${index.change}`);
      console.log(`   涨跌幅: ${index.chg_rate}%`);
      console.log(`   成交额: ${index.amount} 亿元`);
      console.log(`   成交量: ${(index.volume / 100).toFixed(0)} 万手`);
      console.log(`   振幅: ${index.amplitude}%`);
      console.log(`   换手率: ${index.turnover}%`);

      if (index.pe) console.log(`   市盈率: ${index.pe}`);
      if (index.pb) console.log(`   市净率: ${index.pb}`);
    } else {
      console.log('❌ 上证指数数据获取失败');
      console.log(`   错误: ${singleResult.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ 示例3执行失败:', error.message);
  }
  console.log('');

  // 示例4: 获取深证成指数据
  console.log('📈 示例4: 获取深证成指数据');
  try {
    const szResult = await generator.getSingleIndexData('399001.SZ', targetDate);

    if (szResult.success) {
      const index = szResult.data;
      console.log(`✅ 深证成指数据获取成功`);
      console.log(`   代码: ${index.code}`);
      console.log(`   名称: ${index.name}`);
      console.log(`   最新点位: ${index.last}`);
      console.log(`   涨跌点数: ${index.change}`);
      console.log(`   涨跌幅: ${index.chg_rate}%`);
      console.log(`   成交额: ${index.amount} 亿元`);
      console.log(`   成交量: ${(index.volume / 100).toFixed(0)} 万手`);
    } else {
      console.log('❌ 深证成指数据获取失败');
      console.log(`   错误: ${szResult.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ 示例4执行失败:', error.message);
  }
  console.log('');

  // 示例5: 生成包含指数数据的完整报告
  console.log('📋 示例5: 生成包含指数数据的完整报告');
  try {
    const completeResult = await generator.generateCompleteData(targetDate, {
      includeStockData: false,  // 不获取股票数据，只获取指数数据
      includeLimitUp: false,
      includeLimitDown: false,
      includeIndices: true,     // 包含指数数据
      saveToFile: true          // 保存到文件
    });

    if (completeResult.success) {
      const data = completeResult.data;
      console.log(`✅ 完整报告生成成功 (${targetDate})`);

      if (data.indices) {
        console.log(`   指数数据: ${data.indices.indices.length} 个指数`);
        data.indices.indices.forEach(index => {
          console.log(`   - ${index.name}: ${index.last} (${index.chg_rate > 0 ? '+' : ''}${index.chg_rate}%)`);
        });
      }

      console.log(`   报告生成时间: ${completeResult.metadata.generatedAt}`);
    } else {
      console.log('❌ 完整报告生成失败');
      console.log(`   错误: ${completeResult.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ 示例5执行失败:', error.message);
  }
  console.log('');

  // 示例6: 比较两个指数的表现
  console.log('📊 示例6: 比较上证指数和深证成指的表现');
  try {
    const [shResult, szResult] = await Promise.all([
      generator.getSingleIndexData('000001.SH', targetDate),
      generator.getSingleIndexData('399001.SZ', targetDate)
    ]);

    if (shResult.success && szResult.success) {
      const sh = shResult.data;
      const sz = szResult.data;

      console.log(`✅ 指数对比分析 (${targetDate})`);
      console.log(`   上证指数 (${sh.code}): ${sh.last} (${sh.chg_rate > 0 ? '+' : ''}${sh.chg_rate}%)`);
      console.log(`   深证成指 (${sz.code}): ${sz.last} (${sz.chg_rate > 0 ? '+' : ''}${sz.chg_rate}%)`);
      console.log(`   成交额对比: 上证 ${sh.amount} 亿元 vs 深证 ${sz.amount} 亿元`);
      console.log(`   成交量对比: 上证 ${(sh.volume / 100).toFixed(0)} 万手 vs 深证 ${(sz.volume / 100).toFixed(0)} 万手`);

      const difference = sh.chg_rate - sz.chg_rate;
      if (difference > 0) {
        console.log(`   强弱对比: 上证指数相对强势 ${difference.toFixed(2)} 个百分点`);
      } else {
        console.log(`   强弱对比: 深证成指相对强势 ${Math.abs(difference).toFixed(2)} 个百分点`);
      }
    } else {
      console.log('❌ 指数对比分析失败');
      const errors = [...(shResult.errors || []), ...(szResult.errors || [])];
      console.log(`   错误: ${errors.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ 示例6执行失败:', error.message);
  }

  console.log('\n=== 示例完成 ===');
  console.log('\n💡 使用说明:');
  console.log('1. 指数数据来源于东方财富API，实时更新');
  console.log('2. 支持 000001.SH (上证指数) 和 399001.SZ (深证成指)');
  console.log('3. 数据包含价格、成交量、成交额、涨跌幅等完整信息');
  console.log('4. 自动检查交易日，非交易日会返回相应提示');
  console.log('5. 支持缓存机制，避免重复请求');
  console.log('6. 数据自动保存为JSON格式，便于后续分析');
}

// 运行示例
if (require.main === module) {
  exampleIndexDataUsage().catch(console.error);
}

module.exports = exampleIndexDataUsage;