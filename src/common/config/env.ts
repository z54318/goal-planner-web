// 前端统一从这里读取环境变量，避免业务代码散落读取 import.meta.env。
export const appEnv = {
  mode: import.meta.env.VITE_ENV || 'development',
  publicPath: import.meta.env.VITE_PUBLIC_PATH || '/',
  projectName: import.meta.env.VITE_PROJECT_NAME || 'Goal Planner',
  favicon: import.meta.env.VITE_FAVICON || '/favicon.svg',
  baseApi: import.meta.env.VITE_BASE_API || '/api',
} as const
