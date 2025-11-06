# Vue 3 项目 tzsj

一个现代化的 Vue 3 前端项目模板，集成了当前主流的开发工具和最佳实践。

## 📋 项目概述

本项目是一个基于 Vue 3 + Vite + TypeScript 的现代化前端项目模板，包含了开发过程中常用的工具和配置，旨在为开发者提供一个高效、类型安全、易于维护的开发环境。

## 🚀 技术栈

### 核心框架
- **Vue 3.4+** - 渐进式 JavaScript 框架，使用组合式 API
- **TypeScript 5.5+** - JavaScript 的超集，提供静态类型检查
- **Vite 5.2+** - 下一代前端构建工具，提供快速的开发体验

### 状态管理 & 路由
- **Pinia 2.2+** - Vue 的官方状态管理库
- **Vue Router 4.4+** - Vue.js 官方的路由管理器

### UI 框架
- **Element Plus 2.8+** - Vue 3 的桌面端组件库
- **@element-plus/icons-vue** - Element Plus 图标库

### 开发工具
- **ESLint** - 代码质量检查工具
- **Prettier** - 代码格式化工具
- **unplugin-auto-import** - API 自动导入插件
- **unplugin-vue-components** - 组件自动导入插件

### 样式处理
- **Sass** - CSS 预处理器

## 📦 安装和运行

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 yarn >= 1.22.0 或 pnpm >= 6.0.0

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

### 开发环境运行

```bash
# 启动开发服务器
npm run dev

# 使用 yarn
yarn dev

# 使用 pnpm
pnpm dev
```

开发服务器将在 http://localhost:3000 启动，并支持热模块替换。

### 构建生产版本

```bash
# 构建生产版本
npm run build

# 使用 yarn
yarn build

# 使用 pnpm
pnpm build
```

构建文件将输出到 `dist` 目录。

### 预览构建结果

```bash
# 预览生产构建
npm run preview

# 使用 yarn
yarn preview

# 使用 pnpm
pnpm preview
```

## 📁 项目结构

```
vue-tzsj/
├── public/                 # 静态资源
├── src/
│   ├── assets/            # 项目资源
│   ├── components/        # 公共组件
│   │   └── HelloWorld.vue
│   ├── layouts/          # 布局组件
│   │   └── DefaultLayout.vue
│   ├── router/           # 路由配置
│   │   └── index.ts
│   ├── stores/           # Pinia 状态管理
│   │   └── counter.ts
│   ├── styles/           # 全局样式
│   │   └── variables.scss
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/            # 工具函数
│   │   └── index.ts
│   ├── views/            # 页面组件
│   │   ├── About.vue
│   │   └── Home.vue
│   ├── App.vue           # 根组件
│   ├── auto-imports.d.ts # 自动导入类型定义
│   ├── components.d.ts   # 组件自动导入类型定义
│   └── main.ts           # 应用入口
├── .eslintrc.cjs         # ESLint 配置
├── .gitignore            # Git 忽略文件
├── .prettierrc           # Prettier 配置
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── README.md             # 项目文档
├── tsconfig.json         # TypeScript 配置
├── tsconfig.node.json    # Node.js TypeScript 配置
└── vite.config.ts        # Vite 配置
```

## 🛠️ 开发指南

### 组件开发

项目支持组件自动导入，创建的组件会自动注册，无需手动导入：

```vue
<template>
  <div>
    <!-- Element Plus 组件无需导入，直接使用 -->
    <ElButton type="primary">按钮</ElButton>

    <!-- 自定义组件也无需导入 -->
    <HelloWorld msg="Hello Vue 3!" />
  </div>
</template>

<script setup lang="ts">
// Vue API 无需导入，直接使用
const count = ref(0)
const message = computed(() => `Count: ${count.value}`)
</script>
```

### 状态管理

使用 Pinia 进行状态管理：

```typescript
// src/stores/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
```

在组件中使用：

```vue
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'

const counterStore = useCounterStore()

// 直接使用 store
counterStore.increment()
console.log(counterStore.count)
</script>
```

### 路由管理

项目使用 Vue Router 进行路由管理：

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### 样式开发

项目支持 Sass 预处理器，并提供了全局变量：

```scss
// 使用全局变量
.example {
  color: $primary-color;
  padding: $spacing-md;
  border-radius: $border-radius-base;
}
```

### 类型定义

项目提供了一些常用的类型定义：

```typescript
// src/types/index.ts
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

export interface User {
  id: number
  name: string
  email: string
}
```

## 📝 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果
- `npm run lint` - 运行 ESLint 检查
- `npm run lint:fix` - 自动修复 ESLint 错误
- `npm run format` - 使用 Prettier 格式化代码

## 🔧 配置说明

### Vite 配置

项目使用 Vite 作为构建工具，配置文件为 `vite.config.ts`：

- 支持路径别名 `@/` 指向 `src/` 目录
- 配置了 Element Plus 自动导入
- 支持 SCSS 预处理器
- 开发服务器默认端口 3000

### TypeScript 配置

项目使用严格的 TypeScript 配置：

- 启用所有严格类型检查
- 支持路径映射
- 配置了 Vue 3 的类型支持

### ESLint 配置

项目使用 ESLint 进行代码质量检查：

- 遵循 Vue 3 官方推荐规则
- 集成 TypeScript 支持
- 配置了自动修复功能

### Prettier 配置

项目使用 Prettier 进行代码格式化：

- 使用单引号
- 不使用分号
- 2 空格缩进
- 行长度限制 100 字符

## 🎨 特色功能

### 🔥 自动导入

- **Vue API**: `ref`, `computed`, `watch` 等无需手动导入
- **组件**: Element Plus 组件和自定义组件自动导入
- **类型**: 自动生成类型定义文件

### 🗂️ 路径别名

支持 `@/` 别名指向 `src/` 目录：

```typescript
import HelloWorld from '@/components/HelloWorld.vue'
import { formatDate } from '@/utils'
```

### 🎯 类型安全

完整的 TypeScript 支持，提供：
- 组件 props 类型检查
- 事件类型定义
- 路由参数类型推导
- Store 类型安全

### 📱 响应式设计

Element Plus 组件库提供了完善的响应式支持，项目模板也包含了基础的响应式样式配置。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目：

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Element Plus](https://element-plus.org/)
- [Pinia](https://pinia.vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)

## 📞 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- 提交 Issue
- 发起 Discussion
- 邮件联系

---

**Happy Coding! 🎉**