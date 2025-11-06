/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PROD: boolean
  readonly DEV: boolean
  // 这里可以添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
