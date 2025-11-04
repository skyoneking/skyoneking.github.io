const IndexService = require('./src/services/index-service');

/**
 * 简单测试指数数据获取
 */
async function testIndexData() {
  console.log('=== 测试指数数据获取 ===\n');

  const indexService = new IndexService();

  try {
    // 测试获取上证指数数据
    console.log('🔍 测试获取上证指数数据...');
    const result = await indexService.fetchIndexData('000001.SH');

    if (result) {
      console.log('✅ 上证指数数据获取成功:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ 上证指数数据为空');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testIndexData().catch(console.error);