const fs = require('fs-extra');
const path = require('path');
const DateUtils = require('./date-utils');
const FileUtils = require('./file-utils');
const { LOG_LEVELS } = require('../config/constants');

/**
 * 简单的日志工具
 */
class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
  }

  /**
   * 写入日志到文件
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Error} error - 错误对象（可选）
   */
  async writeLog(level, message, error = null) {
    const timestamp = DateUtils.getCurrentDateTime();
    const logFileName = FileUtils.getLogPath(DateUtils.getCurrentDate());

    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (error) {
      logMessage += `\nError: ${error.message}`;
      if (error.stack) {
        logMessage += `\nStack: ${error.stack}`;
      }
    }

    logMessage += '\n';

    try {
      await FileUtils.ensureDir(this.logDir);
      await fs.appendFile(logFileName, logMessage, 'utf8');
    } catch (err) {
      console.error('写入日志文件失败:', err);
    }

    // 同时输出到控制台
    console.log(logMessage.trim());
  }

  /**
   * 记录错误日志
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  async error(message, error = null) {
    await this.writeLog(LOG_LEVELS.ERROR, message, error);
  }

  /**
   * 记录警告日志
   * @param {string} message - 警告消息
   */
  async warn(message) {
    await this.writeLog(LOG_LEVELS.WARN, message);
  }

  /**
   * 记录信息日志
   * @param {string} message - 信息消息
   */
  async info(message) {
    await this.writeLog(LOG_LEVELS.INFO, message);
  }

  /**
   * 记录调试日志
   * @param {string} message - 调试消息
   */
  async debug(message) {
    await this.writeLog(LOG_LEVELS.DEBUG, message);
  }
}

// 导出单例实例
module.exports = new Logger();