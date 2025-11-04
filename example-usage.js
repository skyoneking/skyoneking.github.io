const StockDataGenerator = require('./src/index');

/**
 * 股票数据生成器使用示例
 */
async function exampleUsage() {
  // 创建生成器实例
  const generator = new StockDataGenerator();

  console.log('=== 股票数据生成器使用示例 ===\n');

  // 示例1: 生成指定日期的炸板股列表
  console.log('📋 示例1: 生成炸板股列表');
  const explodedResult = await generator.generateExplodedList('2025-11-03');
  if (explodedResult.success) {
    console.log(`找到 ${explodedResult.data.totalCount} 只炸板股`);
    console.log('数据已保存到文件');
  } else {
    console.log('生成失败:', explodedResult.errors);
  }
  console.log('');

  // 示例2: 生成涨停板天梯
  console.log('📈 示例2: 生成涨停板天梯');
  const limitUpResult = await generator.generateLimitUpLadder('2025-11-03');
  if (limitUpResult.success) {
    console.log(`找到 ${limitUpResult.data.totalCount} 只涨停股`);
    console.log('数据已保存到文件');
  } else {
    console.log('生成失败:', limitUpResult.errors);
  }
  console.log('');

  // 示例3: 获取股票原始数据
  console.log('📊 示例3: 获取股票原始数据');
  const stockDataResult = await generator.fetchDateData('2025-11-03');
  if (stockDataResult.success) {
    const sseCount = stockDataResult.data.sse ? stockDataResult.data.sse.data.length : 0;
    const szseCount = stockDataResult.data.szse ? stockDataResult.data.szse.data.length : 0;
    console.log(`上交所数据: ${sseCount} 条`);
    console.log(`深交所数据: ${szseCount} 条`);
  } else {
    console.log('获取失败:', stockDataResult.errors);
  }
  console.log('');

  // 示例4: 生成完整数据（推荐用法）
  console.log('🎯 示例4: 生成完整数据（推荐用法）');
  const completeResult = await generator.generateCompleteData('2025-11-03', {
    includeStockData: false,  // 不获取原始股票数据
    includeLimitUp: true,     // 生成涨停板天梯
    includeLimitDown: true,   // 生成炸板股列表
    saveToFile: true          // 保存到文件
  });

  if (completeResult.success) {
    console.log('✅ 完整数据生成成功');
    if (completeResult.data.limitUp) {
      console.log(`  涨停板: ${completeResult.data.limitUp.totalCount} 只`);
    }
    if (completeResult.data.limitDown) {
      console.log(`  炸板股: ${completeResult.data.limitDown.totalCount} 只`);
    }
  } else {
    console.log('❌ 生成失败:', completeResult.errors);
  }
  console.log('');

  // 示例5: 批量获取日期范围数据
  console.log('📅 示例5: 批量获取日期范围数据');
  const rangeResult = await generator.fetchRangeData('2025-11-01', '2025-11-03');
  if (rangeResult.success) {
    console.log(`日期范围: ${rangeResult.metadata.dateRange.startDate} ~ ${rangeResult.metadata.dateRange.endDate}`);
    console.log('数据获取成功');
  } else {
    console.log('获取失败:', rangeResult.errors);
  }
  console.log('');

  // 示例6: 缓存管理
  console.log('💾 示例6: 缓存管理');

  // 获取缓存状态
  const cacheStatus = await generator.getCacheStatus();
  if (cacheStatus.success) {
    console.log(`上交所缓存: ${cacheStatus.data.sse.count} 个文件`);
    console.log(`深交所缓存: ${cacheStatus.data.szse.count} 个文件`);
  }

  console.log('\n=== 示例完成 ===');
}

// 运行示例
exampleUsage().catch(console.error);