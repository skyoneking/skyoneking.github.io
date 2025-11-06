/**
 * 批处理器
 * 负责处理大量的历史数据生成任务，提供进度跟踪、错误处理和恢复功能
 */

const fs = require('fs');
const path = require('path');

class BatchProcessor {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || 1, // 默认串行处理
      delayBetweenTasks: options.delayBetweenTasks || 3000, // 默认3秒延迟
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      progressFile: options.progressFile || path.join(__dirname, '../.batch-progress.json'),
      verbose: options.verbose || false,
      ...options
    };

    this.tasks = [];
    this.results = [];
    this.processedCount = 0;
    this.failedCount = 0;
    this.startTime = null;
    this.progressCallbacks = [];
  }

  /**
   * 添加任务
   */
  addTask(task) {
    this.tasks.push({
      id: this.generateTaskId(),
      ...task,
      status: 'pending',
      retries: 0,
      startTime: null,
      endTime: null,
      error: null
    });
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加进度回调
   */
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  /**
   * 触发进度回调
   */
  triggerProgress() {
    const progress = this.getProgress();
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * 获取处理进度
   */
  getProgress() {
    const total = this.tasks.length;
    const processed = this.processedCount;
    const successful = this.results.filter(r => r.success).length;
    const failed = this.failedCount;
    const pending = total - processed;

    return {
      total,
      processed,
      successful,
      failed,
      pending,
      progressPercentage: total > 0 ? (processed / total) * 100 : 0,
      startTime: this.startTime,
      currentTime: Date.now(),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining()
    };
  }

  /**
   * 计算预计剩余时间
   */
  calculateEstimatedTimeRemaining() {
    if (this.processedCount === 0) return null;

    const elapsed = Date.now() - this.startTime;
    const avgTimePerTask = elapsed / this.processedCount;
    const remainingTasks = this.tasks.length - this.processedCount;

    return Math.round(avgTimePerTask * remainingTasks);
  }

  /**
   * 加载进度状态
   */
  loadProgress() {
    try {
      if (fs.existsSync(this.options.progressFile)) {
        const data = JSON.parse(fs.readFileSync(this.options.progressFile, 'utf8'));
        this.tasks = data.tasks || [];
        this.results = data.results || [];
        this.processedCount = data.processedCount || 0;
        this.failedCount = data.failedCount || 0;
        this.startTime = data.startTime || Date.now();

        console.log(`📂 加载进度状态: ${this.processedCount}/${this.tasks.length}`);
        return true;
      }
    } catch (error) {
      console.warn('加载进度文件失败:', error.message);
    }
    return false;
  }

  /**
   * 保存进度状态
   */
  saveProgress() {
    try {
      const data = {
        tasks: this.tasks,
        results: this.results,
        processedCount: this.processedCount,
        failedCount: this.failedCount,
        startTime: this.startTime,
        updatedAt: Date.now()
      };

      fs.writeFileSync(this.options.progressFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn('保存进度文件失败:', error.message);
    }
  }

  /**
   * 清理进度文件
   */
  clearProgress() {
    try {
      if (fs.existsSync(this.options.progressFile)) {
        fs.unlinkSync(this.options.progressFile);
      }
    } catch (error) {
      console.warn('清理进度文件失败:', error.message);
    }
  }

  /**
   * 处理单个任务
   */
  async processTask(task) {
    task.status = 'processing';
    task.startTime = Date.now();

    try {
      if (this.options.verbose) {
        console.log(`🔄 开始处理任务: ${task.name || task.id}`);
      }

      const result = await this.executeTask(task);

      task.status = 'completed';
      task.endTime = Date.now();

      const taskResult = {
        taskId: task.id,
        taskName: task.name,
        success: true,
        result,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.endTime - task.startTime,
        retries: task.retries
      };

      this.results.push(taskResult);
      this.processedCount++;

      if (this.options.verbose) {
        console.log(`✅ 任务完成: ${task.name || task.id} (${Math.round(taskResult.duration / 1000)}s)`);
      }

      return taskResult;

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.endTime = Date.now();
      task.retries++;

      const taskResult = {
        taskId: task.id,
        taskName: task.name,
        success: false,
        error: error.message,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.endTime - task.startTime,
        retries: task.retries
      };

      this.results.push(taskResult);
      this.failedCount++;
      this.processedCount++;

      if (this.options.verbose) {
        console.log(`❌ 任务失败: ${task.name || task.id} - ${error.message}`);
      }

      // 重试逻辑
      if (task.retries < this.options.maxRetries && this.shouldRetry(error)) {
        console.log(`🔄 重试任务: ${task.name || task.id} (${task.retries}/${this.options.maxRetries})`);

        task.status = 'pending';
        await this.delay(this.options.retryDelay);

        return this.processTask(task);
      }

      throw error;
    }
  }

  /**
   * 执行任务
   */
  async executeTask(task) {
    if (typeof task.execute === 'function') {
      return await task.execute();
    } else {
      throw new Error('Task execute method is not a function');
    }
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    const message = error.message.toLowerCase();

    // 网络错误
    if (message.includes('timeout') || message.includes('etimedout') ||
        message.includes('econnreset') || message.includes('econnrefused') ||
        message.includes('socket hang up')) {
      return true;
    }

    // HTTP状态码错误
    const statusCodeMatch = message.match(/status\s*code\s*:?\s*(\d{3})/i);
    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1]);
      return [408, 429, 500, 502, 503, 504].includes(statusCode);
    }

    return false;
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 串行处理
   */
  async processSerially() {
    this.startTime = Date.now();

    console.log(`📋 开始串行处理 ${this.tasks.length} 个任务`);

    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];

      console.log(`\n${'='.repeat(50)}`);
      console.log(`任务进度: ${i + 1}/${this.tasks.length} (${Math.round(((i + 1) / this.tasks.length) * 100)}%)`);
      console.log(`当前任务: ${task.name || task.id}`);
      console.log(`${'='.repeat(50)}`);

      await this.processTask(task);

      // 保存进度
      this.saveProgress();

      // 触发进度回调
      this.triggerProgress();

      // 任务间延迟
      if (i < this.tasks.length - 1) {
        const delay = this.options.delayBetweenTasks + Math.random() * 2000; // 添加随机抖动
        console.log(`⏳ 等待 ${Math.round(delay)}ms 后处理下一个任务...`);
        await this.delay(delay);
      }
    }
  }

  /**
   * 并行处理
   */
  async processParallelly() {
    this.startTime = Date.now();

    console.log(`📋 开始并行处理 ${this.tasks.length} 个任务 (并发数: ${this.options.concurrency})`);

    const concurrency = Math.min(this.options.concurrency, this.tasks.length);
    const queue = [...this.tasks];
    const activeTasks = new Set();

    const processNextTask = async () => {
      if (queue.length === 0 && activeTasks.size === 0) {
        return;
      }

      if (activeTasks.size < concurrency && queue.length > 0) {
        const task = queue.shift();
        activeTasks.add(task);

        try {
          await this.processTask(task);
        } catch (error) {
          console.error(`Task ${task.name || task.id} failed:`, error.message);
        } finally {
          activeTasks.delete(task);
          this.saveProgress();
          this.triggerProgress();
        }

        // 继续处理下一个任务
        setImmediate(processNextTask);
      } else {
        // 等待一段时间后再次检查
        setTimeout(processNextTask, 1000);
      }
    };

    // 启动多个并发的处理函数
    for (let i = 0; i < concurrency; i++) {
      setImmediate(processNextTask);
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;

    const report = {
      generatedAt: new Date().toISOString(),
      options: this.options,
      summary: {
        totalTasks: this.tasks.length,
        processedTasks: this.processedCount,
        successfulTasks: this.results.filter(r => r.success).length,
        failedTasks: this.failedCount,
        totalTime,
        averageTimePerTask: this.processedCount > 0 ? totalTime / this.processedCount : 0
      },
      results: this.results
    };

    // 保存报告
    const reportPath = path.join(__dirname, `../batch-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    return report;
  }

  /**
   * 显示报告
   */
  displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 批处理报告');
    console.log('='.repeat(60));
    console.log(`处理模式: ${this.options.concurrency > 1 ? '并行' : '串行'}`);
    console.log(`并发数量: ${this.options.concurrency}`);
    console.log(`任务间延迟: ${this.options.delayBetweenTasks}ms`);
    console.log('');

    console.log('📈 处理统计:');
    console.log(`  总任务数: ${report.summary.totalTasks}`);
    console.log(`  成功任务: ${report.summary.successfulTasks}`);
    console.log(`  失败任务: ${report.summary.failedTasks}`);
    console.log(`  成功率: ${((report.summary.successfulTasks / report.summary.totalTasks) * 100).toFixed(1)}%`);
    console.log(`  总耗时: ${Math.round(report.summary.totalTime / 1000)}秒`);
    console.log(`  平均耗时: ${Math.round(report.summary.averageTimePerTask / 1000)}秒/任务`);
    console.log('');

    if (report.summary.failedTasks > 0) {
      console.log('❌ 失败的任务:');
      report.results.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.taskName || r.taskId}: ${r.error}`);
      });
      console.log('');
    }

    console.log('✅ 批处理完成！');
  }

  /**
   * 主要处理方法
   */
  async run() {
    try {
      if (this.tasks.length === 0) {
        console.log('⚠️  没有任务需要处理');
        return;
      }

      console.log('🚀 批处理器启动');

      // 尝试加载进度
      const loadedProgress = this.loadProgress();
      if (loadedProgress) {
        console.log('📂 从上次中断处继续处理');
      } else {
        this.startTime = Date.now();
        this.clearProgress();
      }

      // 根据并发设置选择处理方式
      if (this.options.concurrency > 1) {
        await this.processParallelly();
      } else {
        await this.processSerially();
      }

      // 生成和显示报告
      const report = this.generateReport();
      this.displayReport(report);

      // 清理进度文件
      this.clearProgress();

    } catch (error) {
      console.error('❌ 批处理失败:', error.message);
      throw error;
    }
  }
}

module.exports = BatchProcessor;