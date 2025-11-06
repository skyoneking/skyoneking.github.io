<template>
  <div class="default-layout">
    <el-container class="layout-container">
      <!-- 主要内容区域 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style lang="scss" scoped>
.default-layout {
  height: 100vh;
  overflow: hidden;
}

.layout-container {
  height: 100%;
}

.layout-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;

    .logo {
      h1 {
        color: #409eff;
        font-size: 20px;
        margin: 0;
        font-weight: 600;
      }
    }

    .header-menu {
      border-bottom: none;

      :deep(.el-menu-item) {
        display: flex;
        align-items: center;
        gap: 6px;
      }
    }
  }
}

.layout-main {
  background-color: #f5f5f5;
  padding: 20px;
  overflow-y: auto;
}

.layout-footer {
  background-color: #fff;
  border-top: 1px solid #e4e7ed;
  height: 50px;

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }
}
</style>