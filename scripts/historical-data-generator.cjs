#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const HolidayService = require('./HolidayService.cjs');
const NodeStockDataGenerator = require('./NodeStockDataGenerator.cjs');

class HistoricalDataGenerator {
  constructor() {
    this.holidayService = new HolidayService();
    this.generator = new NodeStockDataGenerator();
    this.progressFile = path.join(__dirname, '../.historical-progress.json');
  }

  /**
   * 解析命令行参数
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      days: 30,
      startDate: null,
      endDate: null,
      coverage: 'full', // full, basic, custom
      mode: 'serial', // serial, parallel
      force: false,
      dataTypes: ['sse', 'szse', 'limitup', 'limitdown', 'indices'],
      resume: false,
      verbose: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--days':
          options.days = parseInt(args[++i]) || 30;
          break;
        case '--start-date':
          options.startDate = args[++i];
          break;
        case '--end-date':
          options.endDate = args[++i];
          break;
        case '--coverage':
          options.coverage = args[++i];
          break;
        case '--mode':
          options.mode = args[++i];
          break;
        case '--force':
          options.force = true;
          break;
        case '--data-types':
          options.dataTypes = args[++i].split(',');
          break;
        case '--resume':
          options.resume = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--help':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (!arg.startsWith('--')) {
            console.error(`Unknown argument: ${arg}`);
            this.showHelp();
            process.exit(1);
          }
      }
    }

    return options;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
历史数据生成器

用法:
  node historical-data-generator.cjs [选项]

选项:
  --days <数量>           处理天数 (默认: 30)
  --start-date <日期>     开始日期 (格式: YYYY-MM-DD)
  --end-date <日期>       结束日期 (格式: YYYY-MM-DD)
  --coverage <类型>       数据覆盖范围: full, basic, custom (默认: full)
  --mode <模式>           处理模式: serial, parallel (默认: serial)
  --force                 强制覆盖现有数据
  --data-types <类型>     数据类型: sse,szse,limitup,limitdown,indices
  --resume                恢复中断的处理
  --verbose               详细日志输出
  --help                  显示帮助信息

示例:
  # 生成近30天完整数据
  node historical-data-generator.cjs

  # 生成指定日期范围数据
  node historical-data-generator.cjs --start-date 2025-10-01 --end-date 2025-10-31

  # 强制覆盖现有数据
  node historical-data-generator.cjs --force

  # 仅生成基础数据
  node historical-data-generator.cjs --coverage basic --data-types sse,szse

  # 恢复中断的处理
  node historical-data-generator.cjs --resume
`);
  }

  /**
   * 计算日期范围
   */
  calculateDateRange(options) {
    const today = new Date();
    let startDate, endDate;

    if (options.startDate && options.endDate) {
      startDate = new Date(options.startDate);
      endDate = new Date(options.endDate);
    } else if (options.startDate) {
      startDate = new Date(options.startDate);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + options.days - 1);
    } else {
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // 昨天
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - options.days + 1);
    }

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 生成交易日列表
   */
  generateTradingDays(startDate, endDate, options) {
    console.log('\n📅 计算交易日历...');
    console.log(`日期范围: ${startDate} ~ ${endDate}`);

    const tradingDays = this.holidayService.generateTradingDays(startDate, endDate);

    // 打印统计信息
    this.holidayService.printTradingDayStats(startDate, endDate);

    // 显示交易日列表
    console.log('\n📋 交易日列表:');
    tradingDays.forEach((day, index) => {
      const status = day.holidayInfo && day.holidayInfo.type === 'workday' ? ' (调休)' : '';
      console.log(`  ${index + 1}. ${day.date} ${day.weekday}${status}`);
    });

    return tradingDays;
  }

  /**
   * 加载进度状态
   */
  loadProgress() {
    try {
      if (fs.existsSync(this.progressFile)) {
        const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
        console.log('\n📂 发现未完成的历史数据生成任务');
        console.log(`上次处理: ${progress.lastProcessedDate || '无'}`);
        console.log(`进度: ${progress.processedDates?.length || 0}/${progress.totalDates || 0}`);
        return progress;
      }
    } catch (error) {
      console.warn('加载进度文件失败:', error.message);
    }
    return null;
  }

  /**
   * 保存进度状态
   */
  saveProgress(progress) {
    try {
      progress.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2), 'utf8');
    } catch (error) {
      console.warn('保存进度文件失败:', error.message);
    }
  }

  /**
   * 清理进度文件
   */
  clearProgress() {
    try {
      if (fs.existsSync(this.progressFile)) {
        fs.unlinkSync(this.progressFile);
        console.log('🗑️  清理进度文件');
      }
    } catch (error) {
      console.warn('清理进度文件失败:', error.message);
    }
  }

  /**
   * 处理单个交易日
   */
  async processTradingDay(date, options) {
    console.log(`\n🔄 开始处理交易日: ${date}`);

    const startTime = Date.now();
    const results = {};

    // 确定要处理的数据类型
    const dataTypes = this.getDataTypes(options.coverage, options.dataTypes);

    for (const dataType of dataTypes) {
      try {
        console.log(`  📊 处理 ${dataType} 数据...`);

        const result = await this.processDataType(date, dataType);
        results[dataType] = { success: true, result };

        console.log(`  ✅ ${dataType} 数据处理成功`);

      } catch (error) {
        console.error(`  ❌ ${dataType} 数据处理失败:`, error.message);
        results[dataType] = { success: false, error: error.message };
      }

      // 在数据类型之间添加延迟（反爬虫）
      if (dataTypes.indexOf(dataType) < dataTypes.length - 1) {
        const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5秒随机延迟
        console.log(`  ⏱️  等待 ${Math.round(delay)}ms...`);
        await this.delay(delay);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`⏱️  ${date} 处理完成，耗时: ${Math.round(processingTime / 1000)}秒`);

    return results;
  }

  /**
   * 处理数据类型
   */
  async processDataType(date, dataType) {
    // 根据数据类型调用相应的处理方法
    switch (dataType) {
      case 'sse':
        return await this.generator.fetchSSEData(date);
      case 'szse':
        return await this.generator.fetchSZSEData(date);
      case 'limitup':
        return await this.generator.calculateLimitUpData(date);
      case 'limitdown':
        return await this.generator.calculateLimitDownData(date);
      case 'indices':
        return await this.generator.fetchIndicesData(date);
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }

  /**
   * 根据覆盖范围获取数据类型
   */
  getDataTypes(coverage, customDataTypes) {
    switch (coverage) {
      case 'full':
        return ['sse', 'szse', 'limitup', 'limitdown', 'indices'];
      case 'basic':
        return ['sse', 'szse'];
      case 'custom':
        return customDataTypes;
      default:
        return ['sse', 'szse', 'limitup', 'limitdown', 'indices'];
    }
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成处理报告
   */
  generateReport(results, options) {
    const report = {
      generatedAt: new Date().toISOString(),
      options: options,
      summary: {
        totalDates: results.length,
        successfulDates: results.filter(r => r.success).length,
        failedDates: results.filter(r => !r.success).length,
        processingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0)
      },
      details: results
    };

    // 保存报告
    const reportPath = path.join(__dirname, `../historical-data-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    return report;
  }

  /**
   * 显示处理报告
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 历史数据生成报告');
    console.log('='.repeat(60));
    console.log(`生成时间: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`处理模式: ${report.options.mode}`);
    console.log(`数据覆盖: ${report.options.coverage}`);
    console.log(`强制覆盖: ${report.options.force}`);
    console.log('');

    console.log('📈 处理统计:');
    console.log(`  总交易日: ${report.summary.totalDates}`);
    console.log(`  成功处理: ${report.summary.successfulDates}`);
    console.log(`  处理失败: ${report.summary.failedDates}`);
    console.log(`  成功率: ${((report.summary.successfulDates / report.summary.totalDates) * 100).toFixed(1)}%`);
    console.log(`  总耗时: ${Math.round(report.summary.processingTime / 1000)}秒`);
    console.log('');

    if (report.summary.failedDates > 0) {
      console.log('❌ 失败的交易日:');
      report.details.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.date}: ${r.error}`);
      });
      console.log('');
    }

    console.log('✅ 历史数据生成完成！');
  }

  /**
   * 主要处理方法
   */
  async run() {
    try {
      console.log('🚀 历史数据生成器启动');

      // 解析命令行参数
      const options = this.parseArguments();

      if (options.verbose) {
        this.generator.setVerbose(true);
      }

      // 计算日期范围
      const dateRange = this.calculateDateRange(options);
      const { startDate, endDate } = dateRange;

      // 生成交易日列表
      const tradingDays = this.generateTradingDays(startDate, endDate, options);

      if (tradingDays.length === 0) {
        console.log('⚠️  指定日期范围内没有交易日');
        return;
      }

      // 检查是否恢复中断的处理
      let processedDates = [];
      let startIndex = 0;

      if (options.resume) {
        const progress = this.loadProgress();
        if (progress && progress.startDate === startDate && progress.endDate === endDate) {
          processedDates = progress.processedDates || [];
          startIndex = processedDates.length;

          // 找到下一个要处理的日期
          for (let i = 0; i < processedDates.length; i++) {
            if (processedDates[i] !== tradingDays[i].date) {
              startIndex = i;
              processedDates = processedDates.slice(0, i);
              break;
            }
          }

          console.log(`🔄 从第 ${startIndex + 1} 个交易日恢复处理`);
        }
      }

      // 强制覆盖模式时的确认
      if (options.force && startIndex === 0) {
        console.log('⚠️  强制覆盖模式：将重新生成所有数据');
      } else if (startIndex === 0) {
        console.log('💾 将跳过已存在的数据文件');
      }

      // 处理每个交易日
      const results = [];
      const totalDays = tradingDays.length;

      for (let i = startIndex; i < totalDays; i++) {
        const tradingDay = tradingDays[i];
        const date = tradingDay.date;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`进度: ${i + 1}/${totalDays} (${Math.round(((i + 1) / totalDays) * 100)}%)`);
        console.log(`${'='.repeat(50)}`);

        const startTime = Date.now();
        let result;

        try {
          const dayResults = await this.processTradingDay(date, options);
          result = {
            date,
            success: true,
            results: dayResults,
            processingTime: Date.now() - startTime
          };

          processedDates.push(date);
        } catch (error) {
          result = {
            date,
            success: false,
            error: error.message,
            processingTime: Date.now() - startTime
          };
        }

        results.push(result);

        // 保存进度
        const progress = {
          startDate,
          endDate,
          totalDates: totalDays,
          processedDates,
          lastProcessedDate: date,
          options
        };
        this.saveProgress(progress);

        // 交易日之间的延迟（反爬虫）
        if (i < totalDays - 1) {
          const delay = Math.floor(Math.random() * 6000) + 3000; // 3-9秒随机延迟
          console.log(`⏳ 等待 ${Math.round(delay)}ms 后处理下一个交易日...`);
          await this.delay(delay);
        }
      }

      // 生成和显示报告
      const report = this.generateReport(results, options);
      this.displayReport(report);

      // 清理进度文件
      this.clearProgress();

    } catch (error) {
      console.error('❌ 历史数据生成失败:', error.message);
      process.exit(1);
    }
  }
}

// 启动历史数据生成器
const generator = new HistoricalDataGenerator();
generator.run().catch(error => {
  console.error('❌ 程序执行失败:', error);
  process.exit(1);
});