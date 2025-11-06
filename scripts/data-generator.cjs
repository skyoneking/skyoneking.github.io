#!/usr/bin/env node

const NodeStockDataGenerator = require('./NodeStockDataGenerator.cjs');
const path = require('path');

/**
 * 数据生成CLI脚本
 */
class DataGeneratorCLI {
  constructor() {
    this.generator = new NodeStockDataGenerator();
    this.args = this.parseArgs(process.argv.slice(2));
  }

  /**
   * 解析命令行参数
   */
  parseArgs(argv) {
    const args = {
      date: null,
      today: false,
      yesterday: false,
      types: ['sse', 'szse', 'limitup', 'limitdown', 'indices'],
      analysisOnly: false,
      force: false,
      verbose: false,
      help: false
    };

    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      const nextArg = argv[i + 1];

      switch (arg) {
        case '--date':
          if (nextArg && !nextArg.startsWith('--')) {
            args.date = nextArg;
            i++; // 跳过下一个参数
          }
          break;
        case '--today':
          args.today = true;
          break;
        case '--yesterday':
          args.yesterday = true;
          break;
        case '--types':
          if (nextArg && !nextArg.startsWith('--')) {
            args.types = nextArg.split(',').map(t => t.trim());
            i++;
          }
          break;
        case '--analysis-only':
          args.analysisOnly = true;
          break;
        case '--force':
          args.force = true;
          break;
        case '--verbose':
          args.verbose = true;
          break;
        case '--help':
        case '-h':
          args.help = true;
          break;
      }
    }

    return args;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
股票数据生成工具

用法:
  node data-generator.js [选项]

选项:
  --date <YYYY-MM-DD>    生成指定日期的数据
  --today                 生成今天的数据（默认）
  --yesterday             生成昨天的数据
  --types <types>         指定数据类型，用逗号分隔 (sse,szse,limitup,limitdown,indices)
  --analysis-only         仅生成分析报告
  --force                 强制重新生成，忽略现有数据
  --verbose               显示详细输出
  --help, -h              显示此帮助信息

示例:
  node data-generator.js --today
  node data-generator.js --date 2025-11-04
  node data-generator.js --yesterday --types sse,szse
  node data-generator.js --date 2025-11-04 --verbose
  node data-generator.js --force --types sse

数据类型说明:
  sse        - 上海证券交易所数据
  szse       - 深圳证券交易所数据
  limitup    - 涨停股票数据
  limitdown  - 跌停股票数据
  indices    - 指数数据
    `);
  }

  /**
   * 验证日期格式
   */
  validateDate(dateStr) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      console.error(`错误: 无效的日期格式 "${dateStr}"，请使用 YYYY-MM-DD 格式`);
      return false;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.error(`错误: 无效的日期 "${dateStr}"`);
      return false;
    }

    return true;
  }

  /**
   * 验证数据类型
   */
  validateTypes(types) {
    const validTypes = ['sse', 'szse', 'limitup', 'limitdown', 'indices'];
    const invalidTypes = types.filter(type => !validTypes.includes(type));

    if (invalidTypes.length > 0) {
      console.error(`错误: 无效的数据类型: ${invalidTypes.join(', ')}`);
      console.error(`有效类型: ${validTypes.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * 获取目标日期
   */
  getTargetDate() {
    if (this.args.date) {
      return this.args.date;
    } else if (this.args.yesterday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    } else {
      // 默认为今天
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * 检查每个数据类型的存在状态
   */
  async checkDataExistence(date, types) {
    const status = {};

    for (const type of types) {
      const exists = await this.generator.dataExists(type, date);
      status[type] = {
        exists: exists,
        action: (exists && !this.args.force) ? 'skip' : 'generate'
      };
    }

    return status;
  }

  /**
   * 显示数据存在状态摘要
   */
  showExistenceSummary(status, date) {
    const types = Object.keys(status);
    const existingTypes = types.filter(type => status[type].exists);
    const missingTypes = types.filter(type => !status[type].exists);

    console.log(`\n数据状态检查 (${date}):`);

    if (existingTypes.length > 0) {
      console.log(`  已存在 (${existingTypes.length}): ${existingTypes.join(', ')}`);
    }

    if (missingTypes.length > 0) {
      console.log(`  缺失 (${missingTypes.length}): ${missingTypes.join(', ')}`);
    }

    if (this.args.force) {
      console.log(`  强制模式: 将重新生成所有数据类型`);
    } else {
      console.log(`  常规模式: 仅生成缺失的数据类型`);
    }
  }

  /**
   * 显示进度信息
   */
  showProgress(message) {
    process.stdout.write(`\r${message}`);
  }

  /**
   * 运行数据生成
   */
  async run() {
    try {
      // 显示帮助
      if (this.args.help) {
        this.showHelp();
        return;
      }

      // 设置生成器选项
      this.generator.setVerbose(this.args.verbose);
      this.generator.setForce(this.args.force);

      // 验证参数
      if (this.args.date && !this.validateDate(this.args.date)) {
        process.exit(1);
      }

      if (!this.validateTypes(this.args.types)) {
        process.exit(1);
      }

      // 获取目标日期
      const targetDate = this.getTargetDate();
      console.log(`目标日期: ${targetDate}`);
      console.log(`数据类型: ${this.args.types.join(', ')}`);

      // 检查现有数据状态
      const dataStatus = await this.checkDataExistence(targetDate, this.args.types);
      this.showExistenceSummary(dataStatus, targetDate);

      // 确定需要生成的数据类型
      const typesToGenerate = this.args.types.filter(type =>
        dataStatus[type].action === 'generate'
      );

      if (typesToGenerate.length === 0) {
        console.log('\n所有要求数据已存在，无需生成。使用 --force 强制重新生成。');
        return;
      }

      // 开始生成缺失的数据
      console.log(`\n开始生成数据 (${typesToGenerate.length}/${this.args.types.length})...`);
      const startTime = Date.now();

      let result;
      if (this.args.yesterday) {
        result = await this.generator.fetchYesterdayData(typesToGenerate);
      } else if (this.args.date) {
        result = await this.generator.fetchDateData(this.args.date, typesToGenerate);
      } else {
        result = await this.generator.fetchCurrentData(typesToGenerate);
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // 显示结果摘要
      console.log('\n' + '='.repeat(50));
      console.log('数据生成完成!');

      // 显示操作摘要
      const skippedTypes = this.args.types.filter(type => dataStatus[type].action === 'skip');
      const generatedTypes = typesToGenerate.filter(type =>
        result.data && result.data[type]
      );

      console.log(`日期: ${result.date}`);
      console.log(`耗时: ${duration}秒`);
      console.log(`总数据类型: ${this.args.types.length}`);
      console.log(`跳过已存在: ${skippedTypes.length}`);
      console.log(`尝试生成: ${typesToGenerate.length}`);
      console.log(`成功生成: ${result.summary.success}`);
      console.log(`生成失败: ${result.summary.failed}`);

      // 详细信息
      if (skippedTypes.length > 0) {
        console.log(`\n跳过的数据类型: ${skippedTypes.join(', ')}`);
      }

      if (generatedTypes.length > 0) {
        console.log(`成功生成的数据类型: ${generatedTypes.join(', ')}`);
      }

      if (result.errors.length > 0) {
        console.log('\n错误信息:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

      console.log('\n数据保存位置:');
      console.log(`  生产: dist/data/`);
      console.log(`  备份: data-backup/`);

      // 设置退出码
      if (result.summary.failed > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(`\n数据生成失败: ${error.message}`);
      if (this.args.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new DataGeneratorCLI();
  cli.run().catch(error => {
    console.error('CLI运行失败:', error);
    process.exit(1);
  });
}

module.exports = DataGeneratorCLI;