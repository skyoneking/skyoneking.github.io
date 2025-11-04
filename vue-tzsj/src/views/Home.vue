<template>
  <DefaultLayout>
    <div class="home-container">
      <!-- 欢迎区域 -->
      <el-card class="welcome-card" shadow="hover">
        <div class="welcome-content">
          <div class="welcome-text">
            <h1>欢迎来到 Vue 3 项目 tzsj</h1>
            <p>这是一个使用 Vue 3 + Vite + TypeScript + Element Plus 构建的现代化项目</p>
          </div>
          <div class="welcome-actions">
            <el-button type="primary" size="large" @click="handleGetStarted">
              开始使用
            </el-button>
            <el-button size="large" @click="router.push('/about')">
              了解更多
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 功能介绍 -->
      <div class="features-section">
        <h2>项目特性</h2>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" v-for="feature in features" :key="feature.id">
            <el-card class="feature-card" shadow="hover">
              <div class="feature-content">
                <div class="feature-icon">
                  <el-icon :size="40" :color="feature.color">
                    <component :is="feature.icon" />
                  </el-icon>
                </div>
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 计数器示例 -->
      <el-card class="counter-card" shadow="hover">
        <div class="counter-content">
          <h2>Pinia 状态管理示例</h2>
          <div class="counter-display">
            <el-statistic title="当前计数" :value="counterStore.count" />
            <el-statistic title="双倍计数" :value="counterStore.doubleCount" />
          </div>
          <div class="counter-actions">
            <el-button type="primary" @click="counterStore.increment">
              <el-icon><Plus /></el-icon>
              增加
            </el-button>
            <el-button type="warning" @click="counterStore.decrement">
              <el-icon><Minus /></el-icon>
              减少
            </el-button>
            <el-button type="danger" @click="counterStore.reset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCounterStore } from '@/stores/counter'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import {
  House,
  Setting,
  Document,
  Tools,
  Plus,
  Minus,
  Refresh
} from '@element-plus/icons-vue'

const router = useRouter()
const counterStore = useCounterStore()

// 功能特性列表
const features = ref([
  {
    id: 1,
    title: 'Vue 3 组合式 API',
    description: '使用最新的 Vue 3 Composition API，提供更好的代码组织和类型推导',
    icon: House,
    color: '#409eff'
  },
  {
    id: 2,
    title: 'TypeScript 支持',
    description: '完整的 TypeScript 配置，提供类型安全和更好的开发体验',
    icon: Setting,
    color: '#67c23a'
  },
  {
    id: 3,
    title: 'Element Plus UI',
    description: '基于 Element Plus 的现代化 UI 组件库，开箱即用',
    icon: Document,
    color: '#e6a23c'
  },
  {
    id: 4,
    title: 'Vite 构建工具',
    description: '使用 Vite 作为构建工具，提供快速的开发体验和构建速度',
    icon: Tools,
    color: '#f56c6c'
  }
])

// 开始使用按钮点击事件
const handleGetStarted = () => {
  ElMessage.success('开始使用 Vue 3 项目！')
}
</script>

<style lang="scss" scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.welcome-card {
  margin-bottom: 30px;

  .welcome-content {
    text-align: center;
    padding: 40px 20px;

    .welcome-text {
      margin-bottom: 30px;

      h1 {
        color: #303133;
        font-size: 36px;
        margin-bottom: 15px;
        font-weight: 600;
      }

      p {
        color: #606266;
        font-size: 18px;
        margin: 0;
        line-height: 1.6;
      }
    }

    .welcome-actions {
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;
    }
  }
}

.features-section {
  margin-bottom: 30px;

  h2 {
    text-align: center;
    color: #303133;
    font-size: 28px;
    margin-bottom: 30px;
    font-weight: 600;
  }

  .feature-card {
    margin-bottom: 20px;

    .feature-content {
      text-align: center;
      padding: 20px;

      .feature-icon {
        margin-bottom: 15px;
      }

      h3 {
        color: #303133;
        font-size: 18px;
        margin-bottom: 10px;
        font-weight: 600;
      }

      p {
        color: #606266;
        font-size: 14px;
        line-height: 1.6;
        margin: 0;
      }
    }
  }
}

.counter-card {
  .counter-content {
    text-align: center;
    padding: 30px 20px;

    h2 {
      color: #303133;
      font-size: 24px;
      margin-bottom: 25px;
      font-weight: 600;
    }

    .counter-display {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }

    .counter-actions {
      display: flex;
      justify-content: center;
      gap: 15px;
      flex-wrap: wrap;

      .el-button {
        display: flex;
        align-items: center;
        gap: 5px;
      }
    }
  }
}

@media (max-width: 768px) {
  .welcome-content {
    .welcome-text {
      h1 {
        font-size: 28px !important;
      }

      p {
        font-size: 16px !important;
      }
    }
  }

  .counter-display {
    gap: 20px !important;
  }
}
</style>