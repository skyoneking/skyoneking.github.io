/**
 * 数据验证器
 * 负责验证生成数据的完整性、检测数据缺口和生成质量报告
 */

const fs = require('fs');
const path = require('path');

class DataValidator {
  constructor() {
    this.dataDir = 'dist/data';
    this.backupDir = 'data-backup';
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 验证指定日期范围的数据完整性
   */
  validateDateRange(startDate, endDate, options = {}) {
    const defaults = {
      includeBackup: true,
      strictMode: false,
      generateReport: true,
      ...options
    };

    console.log(`\n🔍 开始验证数据完整性`);
    console.log(`日期范围: ${startDate} ~ ${endDate}`);
    console.log(`验证模式: ${defaults.strictMode ? '严格' : '标准'}`);

    const results = {
      dateRange: { startDate, endDate },
      summary: {},
      details: {},
      issues: [],
      recommendations: []
    };

    // 计算日期范围内的所有日期
    const dateRange = this.generateDateRange(startDate, endDate);

    // 验证每种数据类型
    const dataTypes = ['sse', 'szse', 'limitup', 'limitdown', 'indices'];
    const validationResults = {};

    for (const dataType of dataTypes) {
      console.log(`\n📊 验证 ${dataType.toUpperCase()} 数据...`);
      validationResults[dataType] = this.validateDataType(dataType, dateRange, defaults);
    }

    results.details = validationResults;
    results.summary = this.generateSummary(validationResults);
    results.issues = [...this.errors, ...this.warnings];

    // 生成建议
    results.recommendations = this.generateRecommendations(validationResults);

    // 显示验证结果
    this.displayValidationResults(results);

    // 生成报告
    if (defaults.generateReport) {
      const report = this.generateValidationReport(results);
      this.saveReport(report, startDate, endDate);
    }

    return results;
  }

  /**
   * 生成日期范围
   */
  generateDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(this.formatDate(date));
    }

    return dates;
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
   * 验证数据类型
   */
  validateDataType(dataType, dateRange, options) {
    const result = {
      dataType,
      expectedFiles: dateRange.length,
      existingFiles: [],
      missingFiles: [],
      invalidFiles: [],
      validFiles: [],
      backupFiles: [],
      statistics: {
        totalSize: 0,
        averageSize: 0,
        minSize: Infinity,
        maxSize: 0
      },
      quality: {
        completeness: 0,
        consistency: 0,
        validity: 0
      }
    };

    // 检查主目录
    for (const date of dateRange) {
      const filePath = path.join(this.dataDir, dataType, `${date}.json`);

      if (fs.existsSync(filePath)) {
        result.existingFiles.push(date);

        try {
          const validation = this.validateFile(filePath, dataType);
          if (validation.valid) {
            result.validFiles.push(date);
            result.statistics.totalSize += validation.size;
            result.statistics.minSize = Math.min(result.statistics.minSize, validation.size);
            result.statistics.maxSize = Math.max(result.statistics.maxSize, validation.size);
          } else {
            result.invalidFiles.push({ date, error: validation.error });
            this.errors.push(`${dataType.toUpperCase()}-${date}: ${validation.error}`);
          }
        } catch (error) {
          result.invalidFiles.push({ date, error: error.message });
          this.errors.push(`${dataType.toUpperCase()}-${date}: 文件读取失败 - ${error.message}`);
        }
      } else {
        result.missingFiles.push(date);
        this.warnings.push(`${dataType.toUpperCase()}-${date}: 文件不存在`);
      }
    }

    // 检查备份目录
    if (options.includeBackup) {
      for (const date of dateRange) {
        const backupPath = path.join(this.backupDir, dataType, `${date}.json`);
        if (fs.existsSync(backupPath)) {
          result.backupFiles.push(date);
        }
      }
    }

    // 计算统计信息
    if (result.validFiles.length > 0) {
      result.statistics.averageSize = result.statistics.totalSize / result.validFiles.length;
    } else {
      result.statistics.minSize = 0;
    }

    // 计算质量指标
    result.quality.completeness = (result.validFiles.length / result.expectedFiles) * 100;
    result.quality.consistency = this.calculateConsistency(dataType, result.validFiles);
    result.quality.validity = (result.validFiles.length / result.existingFiles.length) * 100;

    return result;
  }

  /**
   * 验证文件
   */
  validateFile(filePath, dataType) {
    const validation = {
      valid: true,
      size: 0,
      error: null,
      data: null
    };

    try {
      // 检查文件大小
      const stats = fs.statSync(filePath);
      validation.size = stats.size;

      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf8');
      validation.data = JSON.parse(content);

      // 基本结构验证
      if (!this.validateFileStructure(validation.data, dataType)) {
        validation.valid = false;
        validation.error = '文件结构不符合预期';
        return validation;
      }

      // 数据完整性验证
      if (!this.validateDataIntegrity(validation.data, dataType)) {
        validation.valid = false;
        validation.error = '数据完整性检查失败';
        return validation;
      }

      // 文件大小验证
      const expectedSizeRange = this.getExpectedSizeRange(dataType);
      if (validation.size < expectedSizeRange.min || validation.size > expectedSizeRange.max) {
        this.warnings.push(`${dataType} 文件大小异常: ${filePath} (${validation.size} bytes)`);
      }

    } catch (error) {
      validation.valid = false;
      validation.error = error.message;
    }

    return validation;
  }

  /**
   * 验证文件结构
   */
  validateFileStructure(data, dataType) {
    const expectedFields = this.getExpectedFields(dataType);

    for (const field of expectedFields) {
      if (!(field in data)) {
        this.errors.push(`${dataType.toUpperCase()} 文件缺少必要字段: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 验证数据完整性
   */
  validateDataIntegrity(data, dataType) {
    switch (dataType) {
      case 'sse':
      case 'szse':
        return this.validateStockData(data);
      case 'limitup':
      case 'limitdown':
        return this.validateLimitData(data);
      case 'indices':
        return this.validateIndicesData(data);
      default:
        return true;
    }
  }

  /**
   * 验证股票数据
   */
  validateStockData(data) {
    // 检查必要字段
    if (!data.stocks || !Array.isArray(data.stocks)) {
      this.errors.push('股票数据缺少 stocks 字段或不是数组');
      return false;
    }

    // 检查数组元素
    for (let i = 0; i < Math.min(data.stocks.length, 3); i++) {
      const stock = data.stocks[i];
      const requiredFields = ['code', 'name', 'last', 'prev_close', 'volume'];

      for (const field of requiredFields) {
        if (!(field in stock)) {
          this.errors.push(`股票数据第${i + 1}个元素缺少字段: ${field}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证涨跌停数据
   */
  validateLimitData(data) {
    if (!data.stocks || !Array.isArray(data.stocks)) {
      this.errors.push('涨跌停数据缺少 stocks 字段或不是数组');
      return false;
    }

    // 检查排序是否正确
    if (data.stocks.length > 1) {
      for (let i = 0; i < data.stocks.length - 1; i++) {
        const current = data.stocks[i];
        const next = data.stocks[i + 1];

        if (current.rank && next.rank && current.rank > next.rank) {
          this.warnings.push(`涨跌停数据排序异常: 第${i + 1}个元素rank大于第${i + 2}个元素`);
        }
      }
    }

    return true;
  }

  /**
   * 验证指数数据
   */
  validateIndicesData(data) {
    // 指数数据结构可能不同，这里做基本验证
    return true;
  }

  /**
   * 获取预期字段
   */
  getExpectedFields(dataType) {
    const fields = {
      sse: ['generateDate', 'targetDate', 'totalCount', 'stocks'],
      szse: ['generateDate', 'targetDate', 'totalCount', 'stocks'],
      limitup: ['generateDate', 'targetDate', 'totalCount', 'stocks'],
      limitdown: ['generateDate', 'targetDate', 'totalCount', 'stocks'],
      indices: ['generateDate', 'targetDate', 'indices']
    };

    return fields[dataType] || [];
  }

  /**
   * 获取预期文件大小范围
   */
  getExpectedSizeRange(dataType) {
    // 根据经验值设置文件大小范围（字节）
    const ranges = {
      sse: { min: 50000, max: 500000 },      // 50KB - 500KB
      szse: { min: 50000, max: 1000000 },     // 50KB - 1MB
      limitup: { min: 1000, max: 100000 },      // 1KB - 100KB
      limitdown: { min: 1000, max: 100000 },    // 1KB - 100KB
      indices: { min: 1000, max: 50000 }       // 1KB - 50KB
    };

    return ranges[dataType] || { min: 100, max: 1000000 };
  }

  /**
   * 计算一致性
   */
  calculateConsistency(dataType, validFiles) {
    // 这里可以实现更复杂的一致性检查
    // 例如：检查相同日期不同数据类型的时间戳是否一致
    return 100; // 简化实现
  }

  /**
   * 生成汇总统计
   */
  generateSummary(validationResults) {
    const summary = {
      totalExpectedFiles: 0,
      totalExistingFiles: 0,
      totalValidFiles: 0,
      totalMissingFiles: 0,
      totalInvalidFiles: 0,
      totalBackupFiles: 0,
      overallCompleteness: 0,
      overallValidity: 0
    };

    for (const [dataType, result] of Object.entries(validationResults)) {
      summary.totalExpectedFiles += result.expectedFiles;
      summary.totalExistingFiles += result.existingFiles.length;
      summary.totalValidFiles += result.validFiles.length;
      summary.totalMissingFiles += result.missingFiles.length;
      summary.totalInvalidFiles += result.invalidFiles.length;
      summary.totalBackupFiles += result.backupFiles.length;
    }

    if (summary.totalExpectedFiles > 0) {
      summary.overallCompleteness = (summary.totalValidFiles / summary.totalExpectedFiles) * 100;
    }

    if (summary.totalExistingFiles > 0) {
      summary.overallValidity = (summary.totalValidFiles / summary.totalExistingFiles) * 100;
    }

    return summary;
  }

  /**
   * 生成建议
   */
  generateRecommendations(validationResults) {
    const recommendations = [];

    for (const [dataType, result] of Object.entries(validationResults)) {
      // 缺失文件建议
      if (result.missingFiles.length > 0) {
        recommendations.push({
          type: 'missing_files',
          priority: 'high',
          dataType,
          message: `${dataType.toUpperCase()} 缺少 ${result.missingFiles.length} 个文件`,
          files: result.missingFiles
        });
      }

      // 无效文件建议
      if (result.invalidFiles.length > 0) {
        recommendations.push({
          type: 'invalid_files',
          priority: 'high',
          dataType,
          message: `${dataType.toUpperCase()} 有 ${result.invalidFiles.length} 个无效文件`,
          files: result.invalidFiles
        });
      }

      // 完整性建议
      if (result.quality.completeness < 100) {
        recommendations.push({
          type: 'completeness',
          priority: 'medium',
          dataType,
          message: `${dataType.toUpperCase()} 完整度为 ${result.quality.completeness.toFixed(1)}%`,
          details: result.quality
        });
      }
    }

    return recommendations;
  }

  /**
   * 显示验证结果
   */
  displayValidationResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 数据验证报告');
    console.log('='.repeat(60));

    // 显示汇总
    console.log('\n📈 验证汇总:');
    console.log(`  预期文件数: ${results.summary.totalExpectedFiles}`);
    console.log(`  现有文件数: ${results.summary.totalExistingFiles}`);
    console.log(`  有效文件数: ${results.summary.totalValidFiles}`);
    console.log(`  缺失文件数: ${results.summary.totalMissingFiles}`);
    console.log(`  无效文件数: ${results.summary.totalInvalidFiles}`);
    console.log(`  备份文件数: ${results.summary.totalBackupFiles}`);
    console.log(`  整体完整性: ${results.summary.overallCompleteness.toFixed(1)}%`);
    console.log(`  整体有效性: ${results.summary.overallValidity.toFixed(1)}%`);

    // 显示各数据类型统计
    console.log('\n📋 各数据类型统计:');
    for (const [dataType, result] of Object.entries(results.details)) {
      console.log(`  ${dataType.toUpperCase()}:`);
      console.log(`    预期: ${result.expectedFiles} | 现有: ${result.existingFiles.length} | 有效: ${result.validFiles.length} | 缺失: ${result.missingFiles.length}`);
      console.log(`    完整性: ${result.quality.completeness.toFixed(1)}% | 一致性: ${result.quality.consistency.toFixed(1)}% | 有效性: ${result.quality.validity.toFixed(1)}%`);
    }

    // 显示错误和警告
    if (results.issues.length > 0) {
      console.log('\n⚠️  发现的问题:');
      results.issues.slice(0, 10).forEach(issue => {
        console.log(`  ${issue}`);
      });
      if (results.issues.length > 10) {
        console.log(`  ... 还有 ${results.issues.length - 10} 个问题`);
      }
    }

    // 显示建议
    if (results.recommendations.length > 0) {
      console.log('\n💡 改进建议:');
      results.recommendations.forEach(rec => {
        const priority = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`  ${priority} ${rec.message}`);
      });
    }
  }

  /**
   * 生成验证报告
   */
  generateValidationReport(results) {
    return {
      generatedAt: new Date().toISOString(),
      validator: 'DataValidator v1.0',
      summary: results.summary,
      details: results.details,
      issues: results.issues,
      recommendations: results.recommendations
    };
  }

  /**
   * 保存报告
   */
  saveReport(report, startDate, endDate) {
    const reportPath = path.join(
      __dirname,
      `../data-validation-report-${startDate}-to-${endDate}-${Date.now()}.json`
    );

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`\n💾 验证报告已保存: ${reportPath}`);
    } catch (error) {
      console.error('保存验证报告失败:', error.message);
    }
  }

  /**
   * 快速检查
   */
  quickCheck() {
    console.log('🔍 执行快速数据检查...');

    const dataDir = this.dataDir;
    if (!fs.existsSync(dataDir)) {
      console.log('❌ 数据目录不存在');
      return false;
    }

    const dataTypes = fs.readdirSync(dataDir);
    let totalFiles = 0;
    let hasIssues = false;

    console.log('\n📁 数据目录状态:');
    for (const dataType of dataTypes) {
      const typeDir = path.join(dataDir, dataType);
      if (fs.statSync(typeDir).isDirectory()) {
        const files = fs.readdirSync(typeDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        totalFiles += jsonFiles.length;
        console.log(`  ${dataType}/: ${jsonFiles.length} 个文件`);

        // 检查几个文件的结构
        for (let i = 0; i < Math.min(3, jsonFiles.length); i++) {
          const filePath = path.join(typeDir, jsonFiles[i]);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const expectedFields = this.getExpectedFields(dataType);
            const hasAllFields = expectedFields.every(field => field in data);

            if (!hasAllFields) {
              hasIssues = true;
              console.log(`    ⚠️  ${jsonFiles[i]} 结构可能不完整`);
            }
          } catch (error) {
            hasIssues = true;
            console.log(`    ❌ ${jsonFiles[i]} 读取失败: ${error.message}`);
          }
        }
      }
    }

    console.log(`\n📊 总计: ${totalFiles} 个数据文件`);
    console.log(`状态: ${hasIssues ? '发现问题' : '正常'}`);

    return !hasIssues;
  }
}

module.exports = DataValidator;