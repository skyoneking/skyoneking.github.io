<template>
  <DefaultLayout>
    <div class="about-container">
      <!-- 项目介绍 -->
      <el-card class="intro-card" shadow="hover">
        <div class="intro-content">
          <h1>关于 Vue 3 项目 tzsj</h1>
          <p class="intro-description">
            这是一个现代化的 Vue 3 前端项目模板，集成了当前主流的开发工具和最佳实践，
            旨在为开发者提供一个高效、类型安全、易于维护的开发环境。
          </p>
        </div>
      </el-card>

      <!-- 技术栈 -->
      <el-card class="tech-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>技术栈</h2>
          </div>
        </template>

        <div class="tech-grid">
          <div class="tech-item" v-for="tech in techStack" :key="tech.name">
            <div class="tech-icon">
              <el-icon :size="30" :color="tech.color">
                <component :is="tech.icon" />
              </el-icon>
            </div>
            <div class="tech-info">
              <h3>{{ tech.name }}</h3>
              <p>{{ tech.description }}</p>
              <el-tag :type="tech.versionType" size="small">{{ tech.version }}</el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 项目特性 -->
      <el-card class="features-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>项目特性</h2>
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :xs="24" :md="12" v-for="feature in projectFeatures" :key="feature.id">
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon :size="20" color="#409eff">
                  <Check />
                </el-icon>
              </div>
              <div class="feature-content">
                <h4>{{ feature.title }}</h4>
                <p>{{ feature.description }}</p>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 快速开始 -->
      <el-card class="quickstart-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>快速开始</h2>
          </div>
        </template>

        <div class="quickstart-content">
          <el-steps :active="3" finish-status="success" direction="vertical">
            <el-step title="安装依赖" description="npm install 或 yarn install 或 pnpm install" />
            <el-step title="启动开发服务器" description="npm run dev" />
            <el-step title="访问应用" description="打开浏览器访问 http://localhost:3000" />
            <el-step title="开始开发" description="在 src 目录下开始你的开发工作" />
          </el-steps>

          <div class="command-block">
            <h4>常用命令</h4>
            <div class="command-list">
              <div class="command-item" v-for="cmd in commands" :key="cmd.name">
                <el-tag>{{ cmd.name }}</el-tag>
                <code>{{ cmd.command }}</code>
                <span class="command-desc">{{ cmd.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import {
  Document,
  Tools,
  Setting,
  DataAnalysis,
  Monitor,
  Tools as MagicStick,
  Check
} from '@element-plus/icons-vue'

// 技术栈信息
const techStack = ref([
  {
    name: 'Vue 3',
    version: '^3.4.0',
    versionType: 'success' as const,
    description: '渐进式 JavaScript 框架，支持组合式 API',
    icon: Document,
    color: '#4fc08d'
  },
  {
    name: 'TypeScript',
    version: '^5.5.0',
    versionType: 'success' as const,
    description: 'JavaScript 的超集，提供静态类型检查',
    icon: Setting,
    color: '#3178c6'
  },
  {
    name: 'Vite',
    version: '^5.2.0',
    versionType: 'success' as const,
    description: '下一代前端构建工具，提供快速的开发体验',
    icon: Tools,
    color: '#646cff'
  },
  {
    name: 'Element Plus',
    version: '^2.8.0',
    versionType: 'primary' as const,
    description: 'Vue 3 的桌面端组件库',
    icon: Monitor,
    color: '#409eff'
  },
  {
    name: 'Pinia',
    version: '^2.2.0',
    versionType: 'success' as const,
    description: 'Vue 的状态管理库',
    icon: DataAnalysis,
    color: '#ffd700'
  },
  {
    name: 'Vue Router',
    version: '^4.4.0',
    versionType: 'success' as const,
    description: 'Vue.js 官方的路由管理器',
    icon: MagicStick,
    color: '#7952b3'
  }
])

// 项目特性
const projectFeatures = ref([
  {
    id: 1,
    title: '组件自动导入',
    description: 'Element Plus 组件无需手动导入，开箱即用'
  },
  {
    id: 2,
    title: 'API 自动导入',
    description: 'Vue 和 Vue Router 的 API 无需手动导入'
  },
  {
    id: 3,
    title: 'TypeScript 支持',
    description: '完整的类型检查和智能提示'
  },
  {
    id: 4,
    title: '代码规范',
    description: '集成 ESLint 和 Prettier，保证代码质量'
  },
  {
    id: 5,
    title: '热更新',
    description: '开发时支持热模块替换，提升开发效率'
  },
  {
    id: 6,
    title: '路径别名',
    description: '支持 @/src 路径别名，简化导入路径'
  }
])

// 常用命令
const commands = ref([
  {
    name: '开发',
    command: 'npm run dev',
    description: '启动开发服务器'
  },
  {
    name: '构建',
    command: 'npm run build',
    description: '构建生产版本'
  },
  {
    name: '预览',
    command: 'npm run preview',
    description: '预览构建结果'
  },
  {
    name: '代码检查',
    command: 'npm run lint',
    description: '运行 ESLint 检查代码'
  },
  {
    name: '格式化',
    command: 'npm run format',
    description: '使用 Prettier 格式化代码'
  }
])
</script>

<style lang="scss" scoped>
.about-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
}

.intro-card {
  margin-bottom: 30px;

  .intro-content {
    text-align: center;
    padding: 40px 20px;

    h1 {
      color: #303133;
      font-size: 32px;
      margin-bottom: 20px;
      font-weight: 600;
    }

    .intro-description {
      color: #606266;
      font-size: 16px;
      line-height: 1.8;
      margin: 0;
      max-width: 800px;
      margin: 0 auto;
    }
  }
}

.card-header {
  h2 {
    color: #303133;
    font-size: 24px;
    margin: 0;
    font-weight: 600;
  }
}

.tech-card {
  margin-bottom: 30px;

  .tech-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    padding: 10px 0;
  }

  .tech-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    transition: all 0.3s ease;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.1);
    }

    .tech-icon {
      flex-shrink: 0;
    }

    .tech-info {
      flex: 1;

      h3 {
        color: #303133;
        font-size: 16px;
        margin: 0 0 5px 0;
        font-weight: 600;
      }

      p {
        color: #606266;
        font-size: 14px;
        margin: 0 0 10px 0;
        line-height: 1.5;
      }
    }
  }
}

.features-card {
  margin-bottom: 30px;

  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 6px;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: #f5f7fa;
    }

    .feature-icon {
      margin-top: 2px;
    }

    .feature-content {
      flex: 1;

      h4 {
        color: #303133;
        font-size: 15px;
        margin: 0 0 5px 0;
        font-weight: 600;
      }

      p {
        color: #606266;
        font-size: 14px;
        margin: 0;
        line-height: 1.5;
      }
    }
  }
}

.quickstart-card {
  .quickstart-content {
    padding: 20px 0;

    .command-block {
      margin-top: 40px;

      h4 {
        color: #303133;
        font-size: 18px;
        margin-bottom: 20px;
        font-weight: 600;
      }

      .command-list {
        .command-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;

          &:last-child {
            border-bottom: none;
          }

          .el-tag {
            width: 60px;
            text-align: center;
          }

          code {
            background-color: #f5f5f5;
            color: #e74c3c;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            min-width: 140px;
          }

          .command-desc {
            color: #666;
            font-size: 14px;
            flex: 1;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .intro-content {
    h1 {
      font-size: 26px !important;
    }

    .intro-description {
      font-size: 15px !important;
    }
  }

  .tech-grid {
    grid-template-columns: 1fr !important;
  }

  .command-item {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px !important;

    .el-tag {
      width: auto !important;
    }

    code {
      min-width: auto !important;
    }
  }
}
</style>