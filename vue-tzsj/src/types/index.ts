// 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

// 用户相关类型
export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  roles: string[]
  createdAt: string
  updatedAt: string
}

// 菜单项类型
export interface MenuItem {
  id: number
  title: string
  path: string
  icon?: string
  children?: MenuItem[]
  meta?: {
    requireAuth?: boolean
    roles?: string[]
    hidden?: boolean
  }
}

// 表格相关类型
export interface TableData<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 分页参数类型
export interface PaginationParams {
  page: number
  pageSize: number
}

// 通用查询参数类型
export interface QueryParams extends PaginationParams {
  keyword?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}