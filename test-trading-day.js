const StockDataGenerator = require('./src/index');
const DateUtils = require('./src/utils/date-utils');

async function testTradingDayFeatures() {
  console.log('🔍 开始测试非交易日功能...\n');

  const generator = new StockDataGenerator();

  try {
    // 测试1: 交易日状态检查
    console.log('📅 测试1: 交易日状态检查');

    // 测试周末
    const weekendDate = '2025-11-08'; // 假设是周六
    const weekendStatus = await generator.getTradingDayStatus(weekendDate);

    if (weekendStatus.success) {
      console.log(`${weekendDate}: ${weekendStatus.data.isTradingDay ? '交易日' : '非交易日'}`);
      console.log(`   状态: ${weekendStatus.data.reason}`);
      console.log(`   建议: ${weekendStatus.data.suggestion}`);
    } else {
      console.log(`❌ 检查失败: ${weekendStatus.errors.join(', ')}`);
    }
    console.log('');

    // 测试2: 最近交易日查找
    console.log('🔍 测试2: 最近交易日查找');
    const recentResult = await generator.getRecentTradingDay(weekendDate);

    if (recentResult.success) {
      console.log(`基准日期: ${recentResult.data.baseDate}`);
      console.log(`最近交易日: ${recentResult.data.recentTradingDay}`);
      console.log(`回溯天数: ${recentResult.data.daysBack} 天`);
    } else {
      console.log(`❌ 查找失败: ${recentResult.errors.join(', ')}`);
    }
    console.log('');

    // 测试3: 非交易日数据获取
    console.log('📊 测试3: 非交易日数据获取');
    const stockDataResult = await generator.fetchDateData(weekendDate, {
      checkTradingDay: true
    });

    if (stockDataResult.success) {
      console.log('✅ 数据获取成功');
      console.log(`   上交所数据: ${stockDataResult.data.sse ? stockDataResult.data.sse.data.length : 0} 条`);
      console.log(`   深交所数据: ${stockDataResult.data.szse ? stockDataResult.data.szse.data.length : 0} 条`);
    } else {
      console.log('❌ 数据获取失败');
      console.log(`   错误: ${stockDataResult.errors.join(', ')}`);

      if (stockDataResult.metadata && stockDataResult.metadata.tradingDayStatus) {
        console.log(`   交易日状态: ${stockDataResult.metadata.tradingDayStatus.reason}`);
        console.log(`   建议: ${stockDataResult.metadata.tradingDayStatus.suggestion}`);
      }
    }
    console.log('');

    // 测试4: 禁用交易日检查的数据获取
    console.log('📊 测试4: 禁用交易日检查的数据获取');
    const stockDataNoCheckResult = await generator.fetchDateData(weekendDate, {
      checkTradingDay: false
    });

    if (stockDataNoCheckResult.success) {
      console.log('✅ 数据获取成功（禁用交易日检查）');
      console.log(`   上交所数据: ${stockDataNoCheckResult.data.sse ? stockDataNoCheckResult.data.sse.data.length : 0} 条`);
      console.log(`   深交所数据: ${stockDataNoCheckResult.data.szse ? stockDataNoCheckResult.data.szse.data.length : 0} 条`);
    } else {
      console.log('❌ 数据获取失败');
      console.log(`   错误: ${stockDataNoCheckResult.errors.join(', ')}`);
    }
    console.log('');

    // 测试5: 交易日数据获取
    console.log('📊 测试5: 交易日数据获取');
    const tradingDate = '2025-11-03'; // 假设是交易日
    const tradingStockResult = await generator.fetchDateData(tradingDate, {
      checkTradingDay: true
    });

    if (tradingStockResult.success) {
      console.log('✅ 交易日数据获取成功');
      console.log(`   上交所数据: ${tradingStockResult.data.sse ? tradingStockResult.data.sse.data.length : 0} 条`);
      console.log(`   深交所数据: ${tradingStockResult.data.szse ? tradingStockResult.data.szse.data.length : 0} 条`);

      if (tradingStockResult.metadata.tradingDayStatus) {
        console.log(`   交易日状态: ${tradingStockResult.metadata.tradingDayStatus.reason}`);
      }
    } else {
      console.log('❌ 交易日数据获取失败');
      console.log(`   错误: ${tradingStockResult.errors.join(', ')}`);
    }
    console.log('');

    // 测试6: 批量交易日检查
    console.log('📅 测试6: 批量交易日检查');
    const testDates = [
      '2025-11-02', // 假设是周末
      '2025-11-03', // 假设是交易日
      '2025-11-04', // 假设是交易日
    ];

    for (const date of testDates) {
      const status = await DateUtils.getTradingDayStatus(date, true);
      console.log(`${date}: ${status.isTradingDay ? '✅ 交易日' : '❌ 非交易日'} - ${status.reason}`);
    }
    console.log('');

    console.log('🎉 非交易日功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error.message);
    console.error('详细错误:', error.stack);
  }
}

// 运行测试
testTradingDayFeatures();