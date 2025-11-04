/**
 * 自定义错误类型
 */

/**
 * 非交易日错误
 * 当尝试在非交易日获取数据时抛出此错误
 */
class NonTradingDayError extends Error {
  constructor(date, reason, suggestion = null) {
    super(`${date} 是非交易日: ${reason}`);
    this.name = 'NonTradingDayError';
    this.date = date;
    this.reason = reason;
    this.suggestion = suggestion || '请选择一个交易日获取数据';
  }

  /**
   * 转换为JSON格式
   * @returns {Object} 错误信息对象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      date: this.date,
      reason: this.reason,
      suggestion: this.suggestion
    };
  }
}

/**
 * 数据获取错误
 * 当API请求或数据处理失败时抛出此错误
 */
class DataFetchError extends Error {
  constructor(message, source = null, originalError = null) {
    super(message);
    this.name = 'DataFetchError';
    this.source = source;
    this.originalError = originalError;
  }

  /**
   * 转换为JSON格式
   * @returns {Object} 错误信息对象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      source: this.source,
      originalError: this.originalError ? this.originalError.message : null
    };
  }
}

/**
 * 配置错误
 * 当配置参数错误时抛出此错误
 */
class ConfigurationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ConfigurationError';
    this.field = field;
    this.value = value;
  }

  /**
   * 转换为JSON格式
   * @returns {Object} 错误信息对象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value
    };
  }
}

/**
 * 验证错误
 * 当数据验证失败时抛出此错误
 */
class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }

  /**
   * 转换为JSON格式
   * @returns {Object} 错误信息对象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value
    };
  }
}

module.exports = {
  NonTradingDayError,
  DataFetchError,
  ConfigurationError,
  ValidationError
};