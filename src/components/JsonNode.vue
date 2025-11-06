<template>
  <div class="json-node">
    <!-- 数组 -->
    <template v-if="Array.isArray(data)">
      <div
        v-for="(item, index) in data"
        :key="`array-${index}`"
        class="node-item"
      >
        <div class="node-header" @click="toggleNode([...path, String(index)])">
          <span class="node-toggle">
            <el-icon v-if="isExpandable(item)">
              <ArrowRight v-if="!isExpanded([...path, String(index)])" />
              <ArrowDown v-else />
            </el-icon>
            <span v-else class="no-toggle"></span>
          </span>
          <span class="node-index">{{ index }}:</span>
          <span v-if="!isExpandable(item)" class="node-value" :class="getValueClass(item)">
            {{ formatValue(item) }}
          </span>
          <span v-else class="node-type">
            {{ getTypeLabel(item) }}[{{ getLength(item) }}]
          </span>
        </div>

        <!-- 展开/折叠内容 -->
        <div
          v-if="isExpandable(item) && isExpanded([...path, String(index)])"
          class="node-children"
        >
          <json-node
            :data="item"
            :path="[...path, String(index)]"
            :search-keyword="searchKeyword"
            :expanded-nodes="expandedNodes"
            @toggle-expand="$emit('toggleExpand', $event)"
          />
        </div>
      </div>
    </template>

    <!-- 对象 -->
    <template v-else-if="typeof data === 'object' && data !== null">
      <div
        v-for="(value, key) in data"
        :key="`object-${key}`"
        class="node-item"
        :class="{ 'search-highlight': isSearchHighlighted([...path, key]) }"
      >
        <div class="node-header" @click="toggleNode([...path, key])">
          <span class="node-toggle">
            <el-icon v-if="isExpandable(value)">
              <ArrowRight v-if="!isExpanded([...path, key])" />
              <ArrowDown v-else />
            </el-icon>
            <span v-else class="no-toggle"></span>
          </span>
          <span class="node-key">"{{ key }}":</span>
          <span v-if="!isExpandable(value)" class="node-value" :class="getValueClass(value)">
            {{ formatValue(value) }}
          </span>
          <span v-else class="node-type">
            {{ getTypeLabel(value) }}{{
              Array.isArray(value) || typeof value === 'object' ? ` [${getLength(value)}]` : ''
            }}
          </span>
        </div>

        <!-- 展开/折叠内容 -->
        <div
          v-if="isExpandable(value) && isExpanded([...path, key])"
          class="node-children"
        >
          <json-node
            :data="value"
            :path="[...path, key]"
            :search-keyword="searchKeyword"
            :expanded-nodes="expandedNodes"
            @toggle-expand="$emit('toggleExpand', $event)"
          />
        </div>
      </div>
    </template>

    <!-- 基本类型 -->
    <template v-else>
      <div class="node-item">
        <span class="node-value" :class="getValueClass(data)">
          {{ formatValue(data) }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'

// Props 定义
interface Props {
  data: any
  path: (string | number)[]
  searchKeyword: string
  expandedNodes: Set<string>
}

const props = defineProps<Props>()

// Emits 定义
const emit = defineEmits<{
  toggleExpand: [path: (string | number)[]]
}>()

// 计算属性
const isExpanded = (path: (string | number)[]) => {
  return props.expandedNodes.has(path.map(p => String(p)).join('.'))
}

const isExpandable = (value: any) => {
  return (Array.isArray(value) || (typeof value === 'object' && value !== null)) &&
         Object.keys(value).length > 0
}

const isSearchHighlighted = (path: (string | number)[]) => {
  if (!props.searchKeyword.trim()) return false
  return props.expandedNodes.has(path.map(p => String(p)).join('.'))
}

// 方法
const toggleNode = (path: (string | number)[]) => {
  if (isExpandable(path.reduce((obj, key) => obj?.[key], props.data))) {
    emit('toggleExpand', path)
  }
}

const getValueClass = (value: any) => {
  if (value === null) return 'value-null'
  if (typeof value === 'string') return 'value-string'
  if (typeof value === 'number') return 'value-number'
  if (typeof value === 'boolean') return 'value-boolean'
  return ''
}

const formatValue = (value: any) => {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'undefined') return 'undefined'
  return String(value)
}

const getTypeLabel = (value: any) => {
  if (Array.isArray(value)) return 'Array'
  if (value === null) return 'null'
  if (typeof value === 'object') return 'Object'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'number') return 'Number'
  if (typeof value === 'boolean') return 'Boolean'
  return typeof value
}

const getLength = (value: any) => {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'object' && value !== null) return Object.keys(value).length
  return 0
}
</script>

<style lang="scss" scoped>
.json-node {
  .node-item {
    position: relative;

    &:hover {
      background: rgba(64, 158, 255, 0.05);
    }

    &.search-highlight {
      background: rgba(255, 193, 7, 0.2);
      border-left: 3px solid #ffc107;
      padding-left: 5px;
      margin-left: -8px;
    }
  }

  .node-header {
    display: flex;
    align-items: center;
    padding: 2px 0;
    cursor: pointer;
    user-select: none;

    &:hover {
      .node-key {
        color: #409eff;
      }
    }
  }

  .node-toggle {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 4px;

    .no-toggle {
      width: 16px;
      display: inline-block;
    }
  }

  .node-index {
    color: #e6a23c;
    margin-right: 6px;
    font-weight: bold;
  }

  .node-key {
    color: #67c23a;
    margin-right: 6px;

    &::after {
      content: ':';
      margin-right: 6px;
    }
  }

  .node-value {
    margin-right: 6px;

    &.value-string {
      color: #e6a23c;
    }

    &.value-number {
      color: #409eff;
    }

    &.value-boolean {
      color: #f56c6c;
    }

    &.value-null {
      color: #909399;
      font-style: italic;
    }
  }

  .node-type {
    color: #909399;
    font-style: italic;
    margin-left: 4px;
  }

  .node-children {
    margin-left: 20px;
    border-left: 1px dashed #dcdfe6;
    padding-left: 12px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: -1px;
      top: 0;
      width: 1px;
      height: 12px;
      background: #dcdfe6;
    }
  }
}

// 深色主题支持
@media (prefers-color-scheme: dark) {
  .json-node {
    .node-item {
      &:hover {
        background: rgba(64, 158, 255, 0.1);
      }

      &.search-highlight {
        background: rgba(255, 193, 7, 0.3);
        border-left-color: #ffc107;
      }
    }

    .node-index {
      color: #f7ba2a;
    }

    .node-key {
      color: #67c23a;

      &:hover {
        color: #79bbff;
      }
    }

    .node-value {
      &.value-string {
        color: #f7ba2a;
      }

      &.value-number {
        color: #79bbff;
      }

      &.value-boolean {
        color: #f89898;
      }

      &.value-null {
        color: #c0c4cc;
      }
    }

    .node-type {
      color: #c0c4cc;
    }

    .node-children {
      border-left-color: #4c4d4f;

      &::before {
        background: #4c4d4f;
      }
    }
  }
}
</style>