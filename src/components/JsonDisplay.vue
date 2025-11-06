<template>
  <div class="json-display">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索 JSON 内容..."
          clearable
          style="width: 300px"
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button-group style="margin-left: 10px">
          <el-button size="small" @click="expandAll">
            <el-icon><Plus /></el-icon>
            展开全部
          </el-button>
          <el-button size="small" @click="collapseAll">
            <el-icon><Minus /></el-icon>
            折叠全部
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-right">
        <el-button size="small" @click="copyToClipboard">
          <el-icon><DocumentCopy /></el-icon>
          复制 JSON
        </el-button>
        <el-button size="small" @click="downloadJson">
          <el-icon><Download /></el-icon>
          下载文件
        </el-button>
      </div>
    </div>

    <!-- JSON 树形显示 -->
    <div class="json-content" ref="jsonContentRef">
      <div v-if="filteredData === null" class="no-data">
        <el-empty description="无数据" />
      </div>
      <div v-else class="json-tree">
        <json-node
          :data="filteredData"
          :path="[]"
          :search-keyword="searchKeyword"
          :expanded-nodes="expandedNodes"
          @toggle-expand="toggleExpand"
        />
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="json-stats">
      <el-descriptions :column="4" size="small" border>
        <el-descriptions-item label="数据类型">
          <el-tag :type="getDataTypeTag(data).type" size="small">
            {{ getDataTypeTag(data).label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="节点总数">
          {{ totalCount }}
        </el-descriptions-item>
        <el-descriptions-item label="展开节点">
          {{ expandedNodes.size }}
        </el-descriptions-item>
        <el-descriptions-item label="搜索结果">
          {{ searchResults.size }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Plus,
  Minus,
  DocumentCopy,
  Download
} from '@element-plus/icons-vue'
import JsonNode from './JsonNode.vue'

// Props 定义
interface Props {
  data: any
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  data: null,
  title: 'JSON 数据'
})

// 响应式数据
const searchKeyword = ref('')
const expandedNodes = ref(new Set<string>())
const searchResults = ref(new Set<string>())
const jsonContentRef = ref<HTMLElement>()

// 计算属性
const filteredData = computed(() => {
  if (!props.data) return null
  if (!searchKeyword.value.trim()) return props.data
  return props.data // 搜索在 JsonNode 中处理
})

const totalCount = computed(() => {
  if (!props.data) return 0
  return countNodes(props.data)
})

// 方法
/**
 * 递归计算节点数量
 */
const countNodes = (obj: any): number => {
  if (obj === null || obj === undefined) return 1

  if (Array.isArray(obj)) {
    return obj.reduce((count, item) => count + countNodes(item), 0)
  }

  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((count, key) => {
      return count + 1 + countNodes(obj[key])
    }, 0)
  }

  return 1
}

/**
 * 获取数据类型标签
 */
const getDataTypeTag = (data: any) => {
  if (data === null) return { label: 'null', type: 'info' as const }
  if (Array.isArray(data)) return { label: 'Array', type: 'success' as const }
  if (typeof data === 'object') return { label: 'Object', type: 'warning' as const }
  if (typeof data === 'string') return { label: 'String', type: 'primary' as const }
  if (typeof data === 'number') return { label: 'Number', type: 'success' as const }
  if (typeof data === 'boolean') return { label: 'Boolean', type: 'danger' as const }
  return { label: 'Unknown', type: 'info' as const }
}

/**
 * 展开/折叠节点
 */
const toggleExpand = (path: (string | number)[]) => {
  const key = path.map(p => String(p)).join('.')
  if (expandedNodes.value.has(key)) {
    expandedNodes.value.delete(key)
  } else {
    expandedNodes.value.add(key)
  }
}

/**
 * 展开全部
 */
const expandAll = () => {
  const paths = getAllPaths(props.data, [])
  paths.forEach(path => {
    expandedNodes.value.add(path.join('.'))
  })
}

/**
 * 折叠全部
 */
const collapseAll = () => {
  expandedNodes.value.clear()
}

/**
 * 获取所有路径
 */
const getAllPaths = (obj: any, currentPath: (string | number)[]): (string | number)[][] => {
  const paths: (string | number)[][] = []

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const newPath = [...currentPath, index]
      paths.push(newPath)
      if (typeof item === 'object' && item !== null) {
        paths.push(...getAllPaths(item, newPath))
      }
    })
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      const newPath = [...currentPath, key]
      paths.push(newPath)
      const value = obj[key]
      if (typeof value === 'object' && value !== null) {
        paths.push(...getAllPaths(value, newPath))
      }
    })
  }

  return paths
}

/**
 * 搜索处理
 */
const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value.clear()
    return
  }

  const results = searchInObject(props.data, [], searchKeyword.value.toLowerCase())
  searchResults.value = new Set(results.map(path => path.join('.')))

  // 自动展开包含搜索结果的路径
  results.forEach(path => {
    for (let i = 1; i <= path.length; i++) {
      expandedNodes.value.add(path.slice(0, i).join('.'))
    }
  })
}

/**
 * 在对象中搜索
 */
const searchInObject = (obj: any, currentPath: (string | number)[], keyword: string): (string | number)[][] => {
  const results: (string | number)[][] = []

  if (obj === null || obj === undefined) return results

  if (typeof obj === 'string' && obj.toLowerCase().includes(keyword)) {
    results.push(currentPath)
  } else if (typeof obj === 'number' && obj.toString().includes(keyword)) {
    results.push(currentPath)
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const newPath = [...currentPath, index]
      if (typeof item === 'object' && item !== null) {
        results.push(...searchInObject(item, newPath, keyword))
      } else if (typeof item === 'string' && item.toLowerCase().includes(keyword)) {
        results.push(newPath)
      } else if (typeof item === 'number' && item.toString().includes(keyword)) {
        results.push(newPath)
      }
    })
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const newPath = [...currentPath, key]

      // 搜索键名
      if (key.toLowerCase().includes(keyword)) {
        results.push(newPath)
      }

      // 搜索值
      const value = obj[key]
      if (typeof value === 'object' && value !== null) {
        results.push(...searchInObject(value, newPath, keyword))
      } else if (typeof value === 'string' && value.toLowerCase().includes(keyword)) {
        results.push(newPath)
      } else if (typeof value === 'number' && value.toString().includes(keyword)) {
        results.push(newPath)
      }
    })
  }

  return results
}

/**
 * 复制到剪贴板
 */
const copyToClipboard = async () => {
  try {
    const jsonString = JSON.stringify(props.data, null, 2)
    await navigator.clipboard.writeText(jsonString)
    ElMessage.success('JSON 已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

/**
 * 下载 JSON 文件
 */
const downloadJson = () => {
  try {
    const jsonString = JSON.stringify(props.data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${props.title || 'data'}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
    ElMessage.success('文件下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

// 监听数据变化，自动展开根节点
watch(() => props.data, (newData) => {
  if (newData && typeof newData === 'object') {
    nextTick(() => {
      expandedNodes.value.clear()
      // 默认展开第一层
      if (Array.isArray(newData)) {
        newData.forEach((_, index) => {
          expandedNodes.value.add(String(index))
        })
      } else {
        Object.keys(newData).forEach(key => {
          expandedNodes.value.add(key)
        })
      }
    })
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.json-display {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;

  .toolbar-left {
    display: flex;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.json-content {
  flex: 1;
  overflow: auto;
  padding: 16px;

  .no-data {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 200px;
  }

  .json-tree {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 13px;
    line-height: 1.5;
  }
}

.json-stats {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

// 深色主题支持
@media (prefers-color-scheme: dark) {
  .toolbar,
  .json-stats {
    background: #2d3748;
    border-color: #4a5568;
  }

  .json-content {
    background: #1a202c;
  }
}
</style>