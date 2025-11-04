const StockDataGenerator = require('./src/index');

async function testGenerator() {
  console.log('🚀 开始测试股票数据生成器...\n');

  const generator = new StockDataGenerator();

  try {
    // 测试1: 生成炸板股列表
    console.log('📋 测试1: 生成炸板股列表');
    const explodedResult = await generator.generateExplodedList('2025-11-03', { noSave: true });

    if (explodedResult.success) {
      console.log('✅ 炸板股列表生成成功');
      console.log(`   总数量: ${explodedResult.data.totalCount}`);
      console.log(`   日期: ${explodedResult.metadata.date}`);
      console.log(`   生成时间: ${explodedResult.metadata.generatedAt}`);

      if (explodedResult.data.stocks.length > 0) {
        console.log('   前3只股票:');
        explodedResult.data.stocks.slice(0, 3).forEach((stock, index) => {
          console.log(`     ${index + 1}. ${stock.name} (${stock.code}) - 开板${stock.dropRate}%`);
        });
      }
    } else {
      console.log('❌ 炸板股列表生成失败');
      console.log('   错误:', explodedResult.errors);
    }
    console.log('');

    // 测试2: 生成涨停板天梯
    console.log('📈 测试2: 生成涨停板天梯');
    const limitUpResult = await generator.generateLimitUpLadder('2025-11-03', { noSave: true });

    if (limitUpResult.success) {
      console.log('✅ 涨停板天梯生成成功');
      console.log(`   总数量: ${limitUpResult.data.totalCount}`);
      console.log(`   主板: ${limitUpResult.data.mainBoardCount}`);
      console.log(`   创业板/科创板: ${limitUpResult.data.growthBoardCount}`);

      if (limitUpResult.data.stocks.length > 0) {
        console.log('   前3只股票:');
        limitUpResult.data.stocks.slice(0, 3).forEach((stock, index) => {
          console.log(`     ${index + 1}. ${stock.name} (${stock.code}) - 涨幅${stock.actualChangeRate}%`);
        });
      }
    } else {
      console.log('❌ 涨停板天梯生成失败');
      console.log('   错误:', limitUpResult.errors);
    }
    console.log('');

    // 测试3: 获取股票数据
    console.log('📊 测试3: 获取股票数据');
    const stockDataResult = await generator.fetchDateData('2025-11-03');

    if (stockDataResult.success) {
      console.log('✅ 股票数据获取成功');
      console.log(`   上交所数据: ${stockDataResult.data.sse ? stockDataResult.data.sse.data.length : 0} 条`);
      console.log(`   深交所数据: ${stockDataResult.data.szse ? stockDataResult.data.szse.data.length : 0} 条`);
      console.log(`   获取时间: ${stockDataResult.metadata.fetchedAt}`);
    } else {
      console.log('❌ 股票数据获取失败');
      console.log('   错误:', stockDataResult.errors);
    }
    console.log('');

    // 测试4: 生成完整数据
    console.log('🎯 测试4: 生成完整数据');
    const completeResult = await generator.generateCompleteData('2025-11-03', {
      includeStockData: true,
      includeLimitUp: true,
      includeLimitDown: true,
      noSave: true
    });

    if (completeResult.success) {
      console.log('✅ 完整数据生成成功');
      console.log(`   股票数据: ${completeResult.data.stockData ? '已获取' : '未获取'}`);
      console.log(`   涨停板: ${completeResult.data.limitUp ? completeResult.data.limitUp.totalCount + '只' : '未生成'}`);
      console.log(`   炸板股: ${completeResult.data.limitDown ? completeResult.data.limitDown.totalCount + '只' : '未生成'}`);
      console.log(`   生成时间: ${completeResult.metadata.generatedAt}`);
    } else {
      console.log('❌ 完整数据生成失败');
      console.log('   错误:', completeResult.errors);
    }
    console.log('');

    // 测试5: 缓存状态
    console.log('💾 测试5: 获取缓存状态');
    const cacheResult = await generator.getCacheStatus();

    if (cacheResult.success) {
      console.log('✅ 缓存状态获取成功');
      console.log(`   上交所缓存文件: ${cacheResult.data.sse.count} 个`);
      console.log(`   深交所缓存文件: ${cacheResult.data.szse.count} 个`);
      console.log(`   检查时间: ${cacheResult.metadata.checkedAt}`);
    } else {
      console.log('❌ 缓存状态获取失败');
      console.log('   错误:', cacheResult.errors);
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生异常:', error.message);
    console.error('详细错误:', error.stack);
  }
}

// 运行测试
testGenerator();