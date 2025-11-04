/**
 * 股票数据工具类
 */

/**
 * 获取股票的涨跌幅限制
 * @param {Object} stock - 股票数据对象
 * @returns {number} 涨跌幅限制（如0.10表示10%）
 */
function getStockLimit(stock) {
  // ST股票涨跌幅限制为5%
  if (stock.name && (stock.name.includes('ST') || stock.name.includes('*ST'))) {
    return 0.05;
  }

  // 科创板股票（代码以688开头）涨跌幅限制为20%
  if (stock.code && stock.code.startsWith('688')) {
    return 0.20;
  }

  // 创业板股票（代码以300开头）涨跌幅限制为20%
  if (stock.code && stock.code.startsWith('300')) {
    return 0.20;
  }

  // 北交所股票（代码以83、87、88开头）涨跌幅限制为30%
  if (stock.code && (stock.code.startsWith('83') || stock.code.startsWith('87') || stock.code.startsWith('88'))) {
    return 0.30;
  }

  // 默认主板股票涨跌幅限制为10%
  return 0.10;
}

/**
 * 基于价格判断股票是否涨停
 * @param {Object} stock - 股票数据对象
 * @returns {Object} 判断结果对象
 */
function isLimitUpByPrice(stock) {
  try {
    // 检查必要的字段是否存在
    if (!stock.last || !stock.prev_close || stock.prev_close <= 0) {
      return {
        isLimitUp: false,
        limitThreshold: 0,
        limitRate: 0,
        actualChangeRate: 0,
        error: 'Missing or invalid price data'
      };
    }

    const limitRate = getStockLimit(stock);
    const limitThreshold = stock.prev_close * (1 + limitRate);
    const actualChangeRate = ((stock.last - stock.prev_close) / stock.prev_close) * 100;

    // 判断是否涨停（允许小的误差范围）
    const isLimitUp = stock.last >= limitThreshold - 0.01; // 减去0.01元的误差范围

    return {
      isLimitUp: isLimitUp,
      limitThreshold: Math.round(limitThreshold * 100) / 100, // 保留2位小数
      limitRate: limitRate,
      actualChangeRate: Math.round(actualChangeRate * 100) / 100 // 保留2位小数
    };
  } catch (error) {
    return {
      isLimitUp: false,
      limitThreshold: 0,
      limitRate: 0,
      actualChangeRate: 0,
      error: error.message
    };
  }
}

/**
 * 获取股票板块类型
 * @param {Object} stock - 股票数据对象
 * @returns {string} 板块类型
 */
function getStockBoardType(stock) {
  if (!stock.code) return '未知';

  // 科创板
  if (stock.code.startsWith('688')) {
    return '科创板';
  }

  // 创业板
  if (stock.code.startsWith('300')) {
    return '创业板';
  }

  // 中小板
  if (stock.code.startsWith('002')) {
    return '中小板';
  }

  // 主板（上交所600、601、603、605开头）
  if (stock.code.startsWith('600') || stock.code.startsWith('601') ||
      stock.code.startsWith('603') || stock.code.startsWith('605')) {
    return '主板';
  }

  // 深交所主板（000、001开头）
  if (stock.code.startsWith('000') || stock.code.startsWith('001')) {
    return '主板';
  }

  // 北交所
  if (stock.code.startsWith('83') || stock.code.startsWith('87') || stock.code.startsWith('88')) {
    return '北交所';
  }

  return '其他';
}

/**
 * 判断股票是否停牌
 * @param {Object} stock - 股票数据对象
 * @returns {boolean} 是否停牌
 */
function isSuspended(stock) {
  return stock.tradephase === '停牌';
}

/**
 * 判断股票是否为ST股票
 * @param {Object} stock - 股票数据对象
 * @returns {boolean} 是否为ST股票
 */
function isSTStock(stock) {
  return stock.name && (stock.name.includes('ST') || stock.name.includes('*ST'));
}

/**
 * 判断股票是否为北交所股票
 * @param {Object} stock - 股票数据对象
 * @returns {boolean} 是否为北交所股票
 */
function isBeijingStock(stock) {
  return stock.code && (stock.code.startsWith('83') || stock.code.startsWith('87') || stock.code.startsWith('88'));
}

/**
 * 判断股票是否为正常交易状态
 * @param {Object} stock - 股票数据对象
 * @returns {boolean} 是否为正常交易状态
 */
function isNormalTrading(stock) {
  // 不停牌、非ST、非北交所
  return !isSuspended(stock) && !isSTStock(stock) && !isBeijingStock(stock);
}

/**
 * 判断股票是否为新股
 * @param {Object} stock - 股票数据对象
 * @param {number} daysThreshold - 次新股天数阈值（默认60天）
 * @returns {boolean} 是否为新股或次新股
 */
function isNewStock(stock, daysThreshold = 60) {
  // 新股和次新股代码前缀
  const newStockPrefixes = [
    '300', '301',  // 创业板新股
    '688', '787', '753', '833', '835', // 科创板新股
    '605', '603', '601',  // 主板新股（相对较少，但可能）
    '002'  // 中小板新股（相对较少，但可能）
  ];

  return newStockPrefixes.some(prefix => stock.code && stock.code.startsWith(prefix));
}

/**
 * 判断股票是否为新股（严格定义）
 * @param {Object} stock - 股票数据对象
 * @returns {boolean} 是否为新股
 */
function isStrictNewStock(stock) {
  // 更严格的新股识别（主要代码前缀）
  const strictNewStockPrefixes = ['688', '787', '753', '833', '835', '301']; // 主要是科创板新股
  return strictNewStockPrefixes.some(prefix => stock.code && stock.code.startsWith(prefix));
}

/**
 * 过滤掉新股和次新股
 * @param {Array} stocks - 股票数据数组
 * @param {number} daysThreshold - 次新股天数阈值
 * @returns {Array} 过滤后的股票数组
 */
function filterOutNewStocks(stocks, daysThreshold = 60) {
  if (!Array.isArray(stocks)) return stocks;

  return stocks.filter(stock => {
    const isNew = isNewStock(stock, daysThreshold);
    return !isNew; // 保留非新股股票
  });
}

/**
 * 格式化炸板股票数据为列表格式
 * @param {Array} stocks - 炸板股票数组
 * @param {string} targetDate - 目标日期
 * @returns {Object} 格式化后的炸板股数据
 */
function formatExplodedList(stocks, targetDate) {
  const DateUtils = require('./date-utils');

  // 统计各类型炸板股数量
  const totalCount = stocks.length;
  const mainBoardCount = stocks.filter(s => s.boardType === '主板').length;
  const growthBoardCount = stocks.filter(s => s.boardType === '创业板' || s.boardType === '科创板' || s.boardType === '中小板').length;
  const severeCount = stocks.filter(s => s.explodedInfo && s.explodedInfo.explodedType === '深度炸板').length;
  const mediumCount = stocks.filter(s => s.explodedInfo && s.explodedInfo.explodedType === '中度炸板').length;
  const lightCount = stocks.filter(s => s.explodedInfo && s.explodedInfo.explodedType === '轻微炸板').length;

  // 计算统计信息
  const dropRates = stocks.filter(s => s.explodedInfo).map(s => s.explodedInfo.dropRate);
  const avgDropRate = dropRates.length > 0 ? dropRates.reduce((sum, rate) => sum + rate, 0) / dropRates.length : 0;
  const maxDropRate = dropRates.length > 0 ? Math.max(...dropRates) : 0;

  const amounts = stocks.filter(s => s.amount).map(s => s.amount);
  const avgAmount = amounts.length > 0 ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length : 0;

  // 格式化股票数据（列表格式，无排名）
  const formattedStocks = stocks.map(stock => ({
    code: stock.code,
    name: stock.name,
    exchange: stock.exchange || '未知',
    boardType: stock.boardType,
    prevClose: stock.prev_close,
    high: stock.high,
    last: stock.last,
    limitThreshold: stock.explodedInfo ? stock.explodedInfo.limitThreshold : 0,
    dropRate: stock.explodedInfo ? stock.explodedInfo.dropRate : 0,
    dropAmount: stock.explodedInfo ? stock.explodedInfo.dropAmount : 0,
    explodedType: stock.explodedInfo ? stock.explodedInfo.explodedType : '无',
    change: stock.change,
    open: stock.open,
    low: stock.low,
    volume: stock.volume,
    amount: stock.amount,
    ampRate: stock.amp_rate,
    tradephase: stock.tradephase
  }));

  return {
    generateDate: DateUtils.getCurrentDateTime(),
    targetDate: targetDate,
    analysisType: '炸板股分析',
    totalCount: totalCount,
    mainBoardCount: mainBoardCount,
    growthBoardCount: growthBoardCount,
    statistics: {
      avgDropRate: Math.round(avgDropRate * 100) / 100,
      maxDropRate: Math.round(maxDropRate * 100) / 100,
      avgAmount: Math.round(avgAmount),
      severeExplodedCount: severeCount,
      mediumExplodedCount: mediumCount,
      lightExplodedCount: lightCount
    },
    stocks: formattedStocks
  };
}

/**
 * 过滤正常交易的涨停股票
 * @param {Array} stocks - 股票数据数组
 * @param {Object} options - 过滤选项
 * @returns {Array} 过滤后的涨停股票数组
 */
function filterNormalLimitUpStocks(stocks, options = {}) {
  if (!Array.isArray(stocks)) return [];

  // 构建过滤选项
  const filterOptions = {
    excludeNewStocks: options.excludeNewStocks !== false, // 默认排除新股
    newStockDaysThreshold: options.newStockDaysThreshold || 60,
    ...options
  };

  return stocks.filter(stock => {
    // 判断是否涨停
    const limitUpResult = isLimitUpByPrice(stock);
    if (!limitUpResult.isLimitUp) {
      return false;
    }

    // 判断是否为正常交易状态
    if (!isNormalTrading(stock)) {
      return false;
    }

    // 判断是否需要排除新股
    if (filterOptions.excludeNewStocks && isNewStock(stock, filterOptions.newStockDaysThreshold)) {
      return false;
    }

    return true;
  }).map(stock => {
    // 为每个股票添加涨停相关信息
    const limitUpResult = isLimitUpByPrice(stock);
    return {
      ...stock,
      limitUpInfo: limitUpResult,
      boardType: getStockBoardType(stock),
      isNewStock: filterOptions.excludeNewStocks ? isNewStock(stock, filterOptions.newStockDaysThreshold) : false
    };
  });
}

/**
 * 对涨停股票进行排序
 * @param {Array} stocks - 涨停股票数组
 * @returns {Array} 排序后的股票数组
 */
function sortLimitUpStocks(stocks) {
  if (!Array.isArray(stocks)) return [];

  return stocks.sort((a, b) => {
    // 首先按涨停幅度排序（实际涨幅越高越靠前）
    const aChangeRate = a.limitUpInfo ? a.limitUpInfo.actualChangeRate : 0;
    const bChangeRate = b.limitUpInfo ? b.limitUpInfo.actualChangeRate : 0;

    if (Math.abs(aChangeRate - bChangeRate) > 0.01) {
      return bChangeRate - aChangeRate;
    }

    // 涨幅相同则按成交额排序
    const aAmount = a.amount || 0;
    const bAmount = b.amount || 0;

    if (aAmount !== bAmount) {
      return bAmount - aAmount;
    }

    // 成交额相同则按成交量排序
    const aVolume = a.volume || 0;
    const bVolume = b.volume || 0;

    return bVolume - aVolume;
  }).map((stock, index) => {
    // 添加排名
    return {
      ...stock,
      rank: index + 1
    };
  });
}

/**
 * 判断股票是否为炸板股（基于精确标准）
 * @param {Object} stock - 股票数据对象
 * @param {Object} options - 配置选项
 * @returns {Object} 判断结果对象
 */
function isExplodedStock(stock, options = {}) {
  try {
    // 检查必要的字段是否存在
    if (!stock.high || !stock.last || !stock.prev_close || stock.prev_close <= 0) {
      return {
        isExploded: false,
        dropRate: 0,
        dropAmount: 0,
        explodedType: '无',
        error: 'Missing or invalid price data'
      };
    }

    // 1. 获取涨跌幅限制和涨停阈值
    const limitRate = getStockLimit(stock);
    const limitThreshold = stock.prev_close * (1 + limitRate);

    // 2. 判断是否曾涨停（最高价达到涨停阈值）
    const wasLimitUp = stock.high >= limitThreshold - 0.01; // 允许微小误差

    if (!wasLimitUp) {
      return {
        isExploded: false,
        dropRate: 0,
        dropAmount: 0,
        explodedType: '无',
        reason: '未达到涨停价'
      };
    }

    // 3. 计算开板幅度（从最高价回落到收盘价的幅度）
    const dropAmount = stock.high - stock.last;
    const dropRate = (dropAmount / stock.high) * 100;

    // 4. 判断是否为有效开板（回落幅度≥1%）
    const minDropRate = options.minDropRate || 1.0;
    const isValidExploded = dropRate >= minDropRate;

    // 5. 判断收盘是否回封
    const isRecovered = stock.last >= limitThreshold - 0.01;

    // 6. 综合判断是否为炸板
    const isExploded = isValidExploded && !isRecovered;

    // 7. 判断炸板类型
    let explodedType = '无';
    if (isExploded) {
      if (dropRate >= 5.0) {
        explodedType = '深度炸板';
      } else if (dropRate >= 3.0) {
        explodedType = '中度炸板';
      } else {
        explodedType = '轻微炸板';
      }
    }

    return {
      isExploded: isExploded,
      dropRate: Math.round(dropRate * 100) / 100, // 保留2位小数
      dropAmount: Math.round(dropAmount * 100) / 100,
      explodedType: explodedType,
      limitThreshold: Math.round(limitThreshold * 100) / 100,
      limitRate: limitRate,
      wasLimitUp: wasLimitUp,
      isRecovered: isRecovered,
      isValidExploded: isValidExploded
    };
  } catch (error) {
    return {
      isExploded: false,
      dropRate: 0,
      dropAmount: 0,
      explodedType: '无',
      error: error.message
    };
  }
}

/**
 * 过滤炸板股票
 * @param {Array} stocks - 股票数据数组
 * @param {Object} options - 筛选选项
 * @returns {Array} 过滤后的炸板股票数组
 */
function filterExplodedStocks(stocks, options = {}) {
  if (!Array.isArray(stocks)) return [];

  return stocks.filter(stock => {
    // 首先判断是否为正常交易状态
    if (!isNormalTrading(stock)) {
      return false;
    }

    // 判断是否为炸板股
    const explodedResult = isExplodedStock(stock, options);
    if (!explodedResult.isExploded) {
      return false;
    }

    // 可选：只显示特定类型的炸板股
    if (options.explodedType && explodedResult.explodedType !== options.explodedType) {
      return false;
    }

    // 可选：最小开板幅度过滤
    if (options.minDropRate && explodedResult.dropRate < options.minDropRate) {
      return false;
    }

    return true;
  }).map(stock => {
    // 为每个股票添加炸板相关信息
    const explodedResult = isExplodedStock(stock, options);
    return {
      ...stock,
      explodedInfo: explodedResult,
      boardType: getStockBoardType(stock)
    };
  });
}

/**
 * 格式化炸板股票数据为简单JSON格式
 * @param {Array} stocks - 炸板股票数组
 * @param {string} targetDate - 目标日期
 * @returns {Object} 格式化后的炸板股数据
 */
function formatExplodedList(stocks, targetDate) {
  const DateUtils = require('./date-utils');

  // 简单格式化股票数据
  const formattedStocks = stocks.map(stock => ({
    code: stock.code,
    name: stock.name,
    exchange: stock.exchange || '未知',
    boardType: stock.boardType,
    prevClose: stock.prev_close,
    high: stock.high,
    last: stock.last,
    dropRate: stock.explodedInfo ? stock.explodedInfo.dropRate : 0,
    dropAmount: stock.explodedInfo ? stock.explodedInfo.dropAmount : 0,
    explodedType: stock.explodedInfo ? stock.explodedInfo.explodedType : '无'
  }));

  return {
    date: targetDate,
    generateTime: DateUtils.getCurrentDateTime(),
    totalCount: formattedStocks.length,
    stocks: formattedStocks
  };
}

/**
 * 格式化涨停股票数据为输出格式
 * @param {Array} stocks - 排序后的涨停股票数组
 * @param {string} targetDate - 目标日期
 * @returns {Object} 格式化后的天梯数据
 */
function formatLimitUpLadder(stocks, targetDate) {
  const DateUtils = require('./date-utils');

  // 统计各类型股票数量
  const totalCount = stocks.length;
  const mainBoardCount = stocks.filter(s => s.boardType === '主板').length;
  const growthBoardCount = stocks.filter(s => s.boardType === '创业板' || s.boardType === '科创板' || s.boardType === '中小板').length;

  // 格式化股票数据
  const formattedStocks = stocks.map(stock => ({
    rank: stock.rank,
    code: stock.code,
    name: stock.name,
    exchange: stock.exchange || '未知',
    boardType: stock.boardType,
    prevClose: stock.prev_close,
    last: stock.last,
    limitThreshold: stock.limitUpInfo ? stock.limitUpInfo.limitThreshold : 0,
    limitRate: stock.limitUpInfo ? stock.limitUpInfo.limitRate : 0,
    actualChangeRate: stock.limitUpInfo ? stock.limitUpInfo.actualChangeRate : 0,
    change: stock.change,
    open: stock.open,
    high: stock.high,
    low: stock.low,
    volume: stock.volume,
    amount: stock.amount,
    ampRate: stock.amp_rate,
    tradephase: stock.tradephase
  }));

  return {
    generateDate: DateUtils.getCurrentDateTime(),
    targetDate: targetDate,
    totalCount: totalCount,
    mainBoardCount: mainBoardCount,
    growthBoardCount: growthBoardCount,
    calculationMethod: 'price_based',
    stocks: formattedStocks
  };
}


module.exports = {
  getStockLimit,
  isLimitUpByPrice,
  getStockBoardType,
  isSuspended,
  isSTStock,
  isBeijingStock,
  isNormalTrading,
  isNewStock,
  isStrictNewStock,
  filterOutNewStocks,
  filterNormalLimitUpStocks,
  sortLimitUpStocks,
  formatLimitUpLadder,
  isExplodedStock,
  filterExplodedStocks,
  formatExplodedList
};