const StockDataGenerator = require('./src/index');

/**
 * 非交易日功能使用示例
 */
async function exampleTradingDayUsage() {
  console.log('=== 非交易日功能使用示例 ===\n');

  const generator = new StockDataGenerator();

  // 示例1: 检查日期是否为交易日
  console.log('📅 示例1: 检查交易日状态');
  const dateToCheck = '2025-11-08'; // 周六
  const statusResult = await generator.getTradingDayStatus(dateToCheck);

  if (statusResult.success) {
    const status = statusResult.data;
    console.log(`${dateToCheck} 是${status.isTradingDay ? '交易日' : '非交易日'}`);
    console.log(`   状态: ${status.reason}`);
    if (!status.isTradingDay) {
      console.log(`   建议: ${status.suggestion}`);
    }
  } else {
    console.log('❌ 检查失败:', statusResult.errors);
  }
  console.log('');

  // 示例2: 获取最近的交易日
  console.log('🔍 示例2: 获取最近交易日');
  const recentResult = await generator.getRecentTradingDay(dateToCheck);

  if (recentResult.success) {
    const data = recentResult.data;
    console.log(`基准日期: ${data.baseDate}`);
    console.log(`最近交易日: ${data.recentTradingDay}`);
    console.log(`回溯天数: ${data.daysBack} 天`);
  } else {
    console.log('❌ 查找失败:', recentResult.errors);
  }
  console.log('');

  // 示例3: 尝试获取非交易日数据（默认会失败）
  console.log('📊 示例3: 获取非交易日数据（默认启用交易日检查）');
  const nonTradingResult = await generator.fetchDateData(dateToCheck, {
    checkTradingDay: true // 默认启用
  });

  if (nonTradingResult.success) {
    console.log('✅ 数据获取成功');
    console.log(`   上交所数据: ${nonTradingResult.data.sse ? nonTradingResult.data.sse.data.length : 0} 条`);
    console.log(`   深交所数据: ${nonTradingResult.data.szse ? nonTradingResult.data.szse.data.length : 0} 条`);
  } else {
    console.log('❌ 数据获取失败（预期行为）');
    console.log(`   原因: ${nonTradingResult.errors.join(', ')}`);

    if (nonTradingResult.metadata && nonTradingResult.metadata.tradingDayStatus) {
      console.log(`   交易日状态: ${nonTradingResult.metadata.tradingDayStatus.reason}`);
    }
  }
  console.log('');

  // 示例4: 禁用交易日检查的数据获取
  console.log('📊 示例4: 禁用交易日检查的数据获取');
  const ignoreTradingDayResult = await generator.fetchDateData(dateToCheck, {
    checkTradingDay: false // 禁用交易日检查
  });

  if (ignoreTradingDayResult.success) {
    console.log('✅ 数据获取成功（忽略交易日检查）');
    console.log(`   上交所数据: ${ignoreTradingDayResult.data.sse ? ignoreTradingDayResult.data.sse.data.length : 0} 条`);
    console.log(`   深交所数据: ${ignoreTradingDayResult.data.szse ? ignoreTradingDayResult.data.szse.data.length : 0} 条`);
  } else {
    console.log('❌ 数据获取失败');
    console.log(`   错误: ${ignoreTradingDayResult.errors.join(', ')}`);
  }
  console.log('');

  // 示例5: 交易日数据获取（正常流程）
  console.log('📊 示例5: 交易日数据获取');
  const tradingDate = '2025-11-03'; // 交易日
  const tradingResult = await generator.fetchDateData(tradingDate, {
    checkTradingDay: true
  });

  if (tradingResult.success) {
    console.log('✅ 交易日数据获取成功');
    console.log(`   上交所数据: ${tradingResult.data.sse ? tradingResult.data.sse.data.length : 0} 条`);
    console.log(`   深交所数据: ${tradingResult.data.szse ? tradingResult.data.szse.data.length : 0} 条`);

    if (tradingResult.metadata.tradingDayStatus) {
      console.log(`   交易日验证: ${tradingResult.metadata.tradingDayStatus.reason}`);
    }
  } else {
    console.log('❌ 数据获取失败');
    console.log(`   错误: ${tradingResult.errors.join(', ')}`);
  }
  console.log('');

  console.log('=== 示例完成 ===');
  console.log('\n💡 使用建议:');
  console.log('1. 启用交易日检查（默认）可避免无效的API请求');
  console.log('2. 在非交易日时会收到明确的错误信息和建议');
  console.log('3. 可通过checkTradingDay选项控制是否启用交易日检查');
  console.log('4. 使用getRecentTradingDay()获取最近的交易日进行数据获取');
}

// 运行示例
exampleTradingDayUsage().catch(console.error);