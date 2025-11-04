const fs = require('fs-extra');
const path = require('path');
const { PATHS, FILE_NAMES } = require('../config/constants');

/**
 * 文件操作工具函数
 */
class FileUtils {
  /**
   * 确保目录存在，如果不存在则创建
   * @param {string} dirPath - 目录路径
   */
  static async ensureDir(dirPath) {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      console.error(`创建目录失败: ${dirPath}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {boolean} 文件是否存在
   */
  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 读取JSON文件
   * @param {string} filePath - 文件路径
   * @returns {Object|null} 解析后的JSON对象，失败返回null
   */
  static async readJsonFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`读取JSON文件失败: ${filePath}`, error);
      return null;
    }
  }

  /**
   * 写入JSON文件
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   * @param {boolean} ensureDirExists - 是否确保目录存在
   */
  static async writeJsonFile(filePath, data, ensureDirExists = true) {
    try {
      if (ensureDirExists) {
        const dir = path.dirname(filePath);
        await this.ensureDir(dir);
      }

      const jsonString = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf8');
      console.log(`JSON文件写入成功: ${filePath}`);
    } catch (error) {
      console.error(`写入JSON文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 获取SSE数据文件路径
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {string} 文件路径
   */
  static getSseDataPath(date) {
    return path.join(PATHS.SSE_DIR, FILE_NAMES.SSE_DATA(date));
  }

  /**
   * 获取SZSE数据文件路径
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {string} 文件路径
   */
  static getSzseDataPath(date) {
    return path.join(PATHS.SZSE_DIR, FILE_NAMES.SZSE_DATA(date));
  }

  /**
   * 获取日志文件路径
   * @param {string} date - 日期字符串 (YYYY-MM-DD)
   * @returns {string} 文件路径
   */
  static getLogPath(date) {
    return path.join(PATHS.LOGS_DIR, FILE_NAMES.LOG_FILE(date));
  }

  /**
   * 列出指定目录下的所有文件
   * @param {string} dirPath - 目录路径
   * @returns {Array} 文件名数组
   */
  static async listFiles(dirPath) {
    try {
      await this.ensureDir(dirPath);
      const files = await fs.readdir(dirPath);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error(`列出文件失败: ${dirPath}`, error);
      return [];
    }
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   */
  static async deleteFile(filePath) {
    try {
      if (await this.fileExists(filePath)) {
        await fs.remove(filePath);
        console.log(`文件删除成功: ${filePath}`);
      }
    } catch (error) {
      console.error(`删除文件失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 获取文件大小
   * @param {string} filePath - 文件路径
   * @returns {number} 文件大小（字节）
   */
  static async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error(`获取文件大小失败: ${filePath}`, error);
      return 0;
    }
  }

  /**
   * 初始化所有必要的目录
   */
  static async initDirectories() {
    const dirs = [PATHS.DATA_DIR, PATHS.SSE_DIR, PATHS.SZSE_DIR, PATHS.LOGS_DIR];

    for (const dir of dirs) {
      await this.ensureDir(dir);
    }

    console.log('所有必要目录初始化完成');
  }
}

module.exports = FileUtils;