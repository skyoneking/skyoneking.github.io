/**
 * 原始上交所API参考
 * 此文件已迁移到新的模块化系统中，请使用 src/index.js 作为主入口
 *
 * 新系统功能：
 * - 支持上交所和深交所数据获取
 * - 自动缓存机制，避免重复请求
 * - 命令行界面，支持多种操作模式
 * - 完整的错误处理和日志记录
 *
 * 使用方法：
 * node src/index.js current              # 获取当日数据
 * node src/index.js date 2024-01-15      # 获取指定日期数据
 * node src/index.js --help               # 查看所有选项
 */

// 上交所接口地址（原始URL，仅作参考）
const url = 'https://yunhq.sse.com.cn:32042/v1/sh1/list/exchange/equity?callback=jsonpCallback3485725&select=code%2Cname%2Copen%2Chigh%2Clow%2Clast%2Cprev_close%2Cchg_rate%2Cvolume%2Camount%2Ctradephase%2Cchange%2Camp_rate%2Ccpxxsubtype%2Ccpxxprodusta%2C&order=&begin=0&end=9999&_=1762150657566'

// 解码后的参数（供参考）
// decodeURIComponent('callback=jsonpCallback3485725&select=code,name,open,high,low,last,prev_close,chg_rate,volume,amount,tradephase,change,amp_rate,cpxxsubtype,cpxxprodusta,&order=&begin=0&end=9999&_=1762150657566')

console.log('⚠️  此文件为原始参考文件，已迁移到新的模块化系统');
console.log('📖 请使用: node src/index.js --help 查看使用方法');
console.log('🚀 推荐使用: node src/index.js current 获取当日数据');
