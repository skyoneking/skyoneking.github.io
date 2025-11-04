<template>
  <div class="hello-world">
    <el-card class="message-card" shadow="hover">
      <div class="message-content">
        <div class="icon-wrapper">
          <el-icon :size="50" color="#409eff">
            <ChatDotRound />
          </el-icon>
        </div>
        <h2>{{ msg }}</h2>
        <p class="description">
          这是一个可复用的 Vue 3 组件示例，展示了组件的基本结构和属性传递。
        </p>
      </div>
    </el-card>

    <el-card class="props-demo" shadow="hover">
      <template #header>
        <h3>组件属性演示</h3>
      </template>

      <div class="props-content">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="prop-item">
              <strong>消息内容:</strong> {{ msg }}
            </div>
            <div class="prop-item">
              <strong>显示计数:</strong> {{ count }}
            </div>
            <div class="prop-item">
              <strong>是否可见:</strong>
              <el-tag :type="visible ? 'success' : 'danger'">
                {{ visible ? '可见' : '隐藏' }}
              </el-tag>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="actions">
              <el-button type="primary" @click="handleIncrement">
                增加计数
              </el-button>
              <el-button @click="handleToggle">
                切换可见性
              </el-button>
              <el-button type="warning" @click="handleReset">
                重置
              </el-button>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <el-card class="events-demo" shadow="hover">
      <template #header>
        <h3>事件处理演示</h3>
      </template>

      <div class="events-content">
        <el-form :model="form" label-width="100px">
          <el-form-item label="输入消息:">
            <el-input
              v-model="form.message"
              placeholder="输入新的消息"
              @keyup.enter="handleSubmit"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSubmit">
              提交更改
            </el-button>
            <el-button @click="handleClear">
              清空
            </el-button>
          </el-form-item>
        </el-form>

        <div class="event-log" v-if="eventLogs.length > 0">
          <h4>事件日志:</h4>
          <ul>
            <li v-for="(log, index) in eventLogs" :key="index">
              {{ log }}
            </li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'

// 定义组件属性的类型
interface Props {
  msg?: string
  count?: number
  visible?: boolean
}

// 定义组件的默认属性
const props = withDefaults(defineProps<Props>(), {
  msg: 'Hello World!',
  count: 0,
  visible: true
})

// 定义组件事件
const emit = defineEmits<{
  increment: [count: number]
  toggle: [visible: boolean]
  'message-change': [message: string]
  reset: []
}>()

// 组件内部状态
const form = reactive({
  message: props.msg
})

const eventLogs = ref<string[]>([])

// 添加事件日志
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString()
  eventLogs.value.unshift(`[${timestamp}] ${message}`)

  // 最多保留10条日志
  if (eventLogs.value.length > 10) {
    eventLogs.value = eventLogs.value.slice(0, 10)
  }
}

// 处理计数增加
const handleIncrement = () => {
  const newCount = props.count + 1
  emit('increment', newCount)
  addLog(`计数增加到: ${newCount}`)
}

// 处理可见性切换
const handleToggle = () => {
  const newVisible = !props.visible
  emit('toggle', newVisible)
  addLog(`可见性切换为: ${newVisible ? '可见' : '隐藏'}`)
}

// 处理重置
const handleReset = () => {
  emit('reset')
  form.message = props.msg
  addLog('组件已重置')
}

// 处理表单提交
const handleSubmit = () => {
  if (form.message.trim()) {
    emit('message-change', form.message)
    addLog(`消息更改为: ${form.message}`)
  }
}

// 处理清空
const handleClear = () => {
  form.message = ''
  addLog('输入已清空')
}
</script>

<style lang="scss" scoped>
.hello-world {
  max-width: 800px;
  margin: 0 auto;
}

.message-card {
  margin-bottom: 20px;

  .message-content {
    text-align: center;
    padding: 30px 20px;

    .icon-wrapper {
      margin-bottom: 20px;
    }

    h2 {
      color: #303133;
      font-size: 28px;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .description {
      color: #606266;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
  }
}

.props-demo,
.events-demo {
  margin-bottom: 20px;

  :deep(.el-card__header) {
    h3 {
      margin: 0;
      color: #303133;
      font-size: 18px;
      font-weight: 600;
    }
  }
}

.props-content {
  .prop-item {
    margin-bottom: 12px;
    color: #606266;
    font-size: 14px;

    strong {
      color: #303133;
      margin-right: 8px;
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .el-button {
      width: 100%;
    }
  }
}

.events-content {
  .event-log {
    margin-top: 20px;
    padding: 15px;
    background-color: #f5f7fa;
    border-radius: 6px;

    h4 {
      margin: 0 0 10px 0;
      color: #303133;
      font-size: 14px;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      color: #606266;
      font-size: 13px;
      line-height: 1.6;
      max-height: 150px;
      overflow-y: auto;

      li {
        margin-bottom: 4px;
      }
    }
  }
}

@media (max-width: 768px) {
  .message-content {
    h2 {
      font-size: 24px !important;
    }

    .description {
      font-size: 14px !important;
    }
  }

  .actions {
    margin-top: 20px !important;
  }
}
</style>