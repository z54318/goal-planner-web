import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 根据环境变量动态生成开发配置，方便切换不同后端服务和部署路径。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const baseApi = env.VITE_BASE_API || '/api'
  const proxyTarget = env.VITE_PROXY_TARGET

  return {
    base: env.VITE_PUBLIC_PATH || '/',
    plugins: [react()],
    server: {
      open: true,
      proxy: proxyTarget
        ? {
            [baseApi]: {
              target: proxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  }
})
