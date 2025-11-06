import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import path from 'path'
import fs from 'fs'

// 尝试回退到最新的可用文件
function tryFallbackFile(urlPath: string, baseDir: string): { path: string; date: string; content: string } | null {
  try {
    const url = new URL(urlPath, 'http://localhost')
    const pathname = url.pathname
    const dataTypeMatch = pathname.match(/\/data\/([^\/]+)\/([^\/]+)\.json$/)

    if (!dataTypeMatch) return null

    const [, dataType, requestedDate] = dataTypeMatch
    const dataDir = path.join(baseDir, dataType)

    if (!existsSync(dataDir)) return null

    const files = readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)) // 按日期降序排列

    // 查找最新的可用文件（对于未来日期，返回最新的文件；对于过去的日期，返回最接近的文件）
    for (const file of files) {
      const fileDate = file.replace('.json', '')
      // 如果请求的是未来日期，直接返回最新文件
      // 如果请求的是过去日期，返回最接近但不大于请求日期的文件
      if (fileDate <= requestedDate) {
        const filePath = `${dataDir}/${file}`
        const content = readFileSync(filePath, 'utf-8')
        return {
          path: filePath,
          date: fileDate,
          content
        }
      }
    }

    // 如果没有找到小于等于请求日期的文件（请求日期比所有文件都早），返回最新文件
    if (files.length > 0) {
      const latestFile = files[0]
      const fileDate = latestFile.replace('.json', '')
      const filePath = `${dataDir}/${latestFile}`
      const content = readFileSync(filePath, 'utf-8')
      return {
        path: filePath,
        date: fileDate,
        content
      }
    }

    return null
  } catch (error) {
    console.warn('[Fallback] 回退文件查找失败:', error)
    return null
  }
}

// 确保数据文件在构建后被复制
function copyDataFiles() {
  const sourceDirs = ['data-backup', 'dist/data']
  const targetDir = 'dist/data'

  // 确保目标目录存在
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // 数据类型列表
  const dataTypes = ['sse', 'szse', 'limitup', 'limitdown', 'indices']

  for (const dataType of dataTypes) {
    for (const sourceDir of sourceDirs) {
      const sourcePath = `${sourceDir}/${dataType}`
      if (existsSync(sourcePath)) {
        const files = readdirSync(sourcePath)
        for (const file of files) {
          const sourceFile = `${sourcePath}/${file}`
          const targetFile = `${targetDir}/${dataType}/${file}`

          // 确保目标子目录存在
          const targetSubDir = `${targetDir}/${dataType}`
          if (!existsSync(targetSubDir)) {
            mkdirSync(targetSubDir, { recursive: true })
          }

          try {
            const sourceData = readFileSync(sourceFile)
            writeFileSync(targetFile, sourceData)
          } catch (error) {
            console.warn(`⚠ Failed to copy ${sourceFile}:`, error)
          }
        }
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: [
        'vue',
        'vue-router',
        'pinia'
      ],
      dts: true,
      eslintrc: {
        enabled: true
      }
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: true
    }),
    // 自定义插件 - 数据文件中间件
    {
      name: 'data-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/data/') && req.url.endsWith('.json')) {
            // 从请求中提取文件路径
            const urlPath = req.url
            const backupPath = path.resolve(process.cwd(), urlPath.replace('/data/', 'data-backup/'))
            const distPath = path.resolve(process.cwd(), 'dist', urlPath)

            console.log(`[DataMiddleware] 请求: ${urlPath}`)

            // 尝试从data-backup目录读取
            try {
              if (fs.existsSync(backupPath)) {
                console.log(`[DataMiddleware] 从备份读取: ${backupPath}`)
                const data = fs.readFileSync(backupPath, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(data)
                return
              }
            } catch (error) {
              console.warn(`[DataMiddleware] 读取备份失败: ${backupPath}`, error)
            }

            // 尝试从dist/data目录读取
            try {
              if (fs.existsSync(distPath)) {
                console.log(`[DataMiddleware] 从dist读取: ${distPath}`)
                const data = fs.readFileSync(distPath, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.setHeader('Access-Control-Allow-Origin', '*')
                res.end(data)
                return
              }
            } catch (error) {
              console.warn(`[DataMiddleware] 读取dist失败: ${distPath}`, error)
            }

            // 如果原始文件不存在，尝试回退到最新的可用文件
            const fallbackData = tryFallbackFile(urlPath, path.resolve(process.cwd(), 'data-backup/'))
            if (fallbackData) {
              console.log(`[DataMiddleware] 使用回退数据: ${fallbackData.date} -> ${urlPath}`)
              res.setHeader('Content-Type', 'application/json')
              res.setHeader('Access-Control-Allow-Origin', '*')
              res.setHeader('X-Fallback-Data', 'true')
              res.setHeader('X-Fallback-Date', fallbackData.date)
              res.end(fallbackData.content)
              return
            }

            console.log(`[DataMiddleware] 文件未找到: ${urlPath}`)
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              error: '文件未找到',
              path: urlPath,
              message: '请求的数据文件不存在，请稍后重试或选择其他日期'
            }))
            return
          }
          next()
        })
      }
    },
    // 自定义插件 - 构建后复制数据文件
    {
      name: 'copy-data-files',
      closeBundle() {
        console.log('📋 Copying stock data files after build...')
        copyDataFiles()
        console.log('✅ Stock data files copy completed')
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true,
    fs: {
      // 允许访问项目根目录外的文件
      strict: false
    }
  },
  // 静态文件服务配置
  publicDir: 'public',
  // 添加额外的静态目录
  optimizeDeps: {
    include: ['element-plus', '@element-plus/icons-vue']
  },
  base: process.env.NODE_ENV === 'production' ? '/dist/' : '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
        api: 'modern-compiler'
      }
    }
  }
})